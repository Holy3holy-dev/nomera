"""Decode only the original pixels referenced by the local integration manifest.

Xbox 360 tiled address transform adapted from MIT XNFSTPKTool by xan1242.
See XNFSTPKTool-LICENSE.txt. HUFF is handled by external official QuickBMS.
"""
from pathlib import Path
from PIL import Image
import sys, json, struct, hashlib, subprocess, io

source, output, quickbms, bms = map(Path, sys.argv[1:5])
manifest = json.loads((Path(__file__).resolve().parents[2] / 'assets/authors-mw/provenance.json').read_text())
output.mkdir(parents=True, exist_ok=True)
rows = {t['hash']: t for t in manifest['textures'] + manifest['trafficTextures']}
verified, unpacked, result = set(), {}, {}

def digest(b): return hashlib.sha256(b).hexdigest()

def tiled(x, y, width, lb):
    aw = (width + 31) & ~31
    ma = ((x >> 5) + (y >> 5) * (aw >> 5)) << (lb + 7)
    mi = ((x & 7) + ((y & 14) << 2)) << lb
    o = ma + ((mi & ~15) << 1) + (mi & 15) + ((y & 1) << 4)
    return (((o & ~511) << 3) + ((y & 16) << 7) + ((o & 448) << 2) + (((((y & 8) >> 2) + (x >> 3)) & 3) << 6) + (o & 63)) >> lb

def decode(raw, w, h, fmt):
    fourcc = {0x22: b'DXT1', 0x24: b'DXT3', 0x26: b'DXT5'}[fmt]
    bp = 8 if fmt == 0x22 else 16
    lb = 3 if bp == 8 else 4
    bw, bh = max(w // 4, 1), max(h // 4, 1)
    linear = bytearray(bw * bh * bp)
    for y in range(bh):
        for x in range(bw):
            at, dst = tiled(x, y, bw, lb) * bp, (y * bw + x) * bp
            block = raw[at:at + bp]
            if len(block) != bp: raise ValueError('Truncated tiled texture')
            linear[dst:dst + bp] = block
    linear = bytearray(v for i in range(0, len(linear), 2) for v in (linear[i + 1], linear[i]))
    header = b'DDS ' + struct.pack('<7I', 124, 0x81007, h, w, len(linear), 0, 1) + bytes(44)
    header += struct.pack('<II4sIIIII', 32, 4, fourcc, 0, 0, 0, 0, 0) + struct.pack('<5I', 0x1000, 0, 0, 0, 0)
    return Image.open(io.BytesIO(header + linear)).convert('RGBA')

for key, t in rows.items():
    pack = (t['archive'], t['archiveEntryOffset'], t['archiveEntrySize'])
    with (source / t['archive']).open('rb') as f:
        if pack not in verified:
            f.seek(t['archiveEntryOffset'])
            original = f.read(t['archiveEntrySize'])
            if digest(original) != t['archiveEntrySHA256']: raise ValueError('Source pack hash: ' + t['source'])
            verified.add(pack)
        if t['pixelOffset'] is not None:
            f.seek(t['archiveEntryOffset'] + t['pixelOffset'])
            raw = f.read(t['pixelBytes'])
        else:
            if pack not in unpacked:
                f.seek(t['archiveEntryOffset'])
                temp = output / ('source-' + Path(t['source']).parts[-2] + '.bin')
                temp.write_bytes(f.read(t['archiveEntrySize']))
                dest = output / ('huff-' + key)
                dest.mkdir(exist_ok=True)
                with (output / ('huff-' + key + '.log')).open('w') as log:
                    subprocess.run([str(quickbms), '-Y', '-o', str(bms), str(temp), str(dest)], stdout=log, stderr=log, check=True)
                entries = {}
                for p in dest.rglob('*'):
                    if p.is_file():
                        b = p.read_bytes()
                        if len(b) > 156:
                            entries[f'{struct.unpack_from("<I", b, len(b) - 120)[0]:08x}'] = b[:-156]
                unpacked[pack] = entries
            raw = unpacked[pack][key]
    if digest(raw) != t['rawSHA256']: raise ValueError('Pixel payload hash: ' + t['name'])
    file = output / (key + '_' + t['name'] + '.png')
    decode(raw, t['width'], t['height'], int(t['compression'], 16)).save(file)
    if digest(file.read_bytes()) != t['pngSHA256']: raise ValueError('PNG hash (check Pillow version): ' + t['name'])
    result[key] = str(file.resolve())
(output / 'hash-png.json').write_text(json.dumps(result, indent=2))
print('Verified and decoded', len(result), 'original textures')
