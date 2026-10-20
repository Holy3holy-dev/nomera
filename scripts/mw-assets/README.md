# Original local MW assets

`rebuild.cjs` reads the exact selected ranges from the user's local console archives and writes only to a **new** output directory. It never writes to the source archive or replaces runtime assets. `assets/authors-mw/provenance.json` contains archive offsets and SHA256 for source entries, compressed payloads, original pixel payloads, PNGs and GLBs.

Requirements: Node, Python with Pillow 12.3.0, official QuickBMS 0.12 and `nfsu_bun.bms`. The executable and BMS are not redistributed here. Primary downloads:

- https://aluigi.altervista.org/quickbms.htm
- https://aluigi.altervista.org/bms/nfsu_bun.bms

Verified QuickBMS binary SHA256: `ff812d38e22aea0cc2cdc13c5c91ca34fae4443ab12987002105be6bab3f4948`.
BMS SHA256: `c781a57ced9ddce5511b77557f262482e7ef3f0d3aa9249583183cd564c03a94`.

From repository root (PowerShell):

```powershell
node scripts/mw-assets/rebuild.cjs 'E:/Torrent/Need-For-Speed-Most-Wanted/switch/nfsmw-nx/game_root/NFS' 'path/to/quickbms.exe' 'path/to/nfsu_bun.bms' 'path/to/python.exe' 'work/mw-rebuild-new'
```

Verified locally: all four output GLBs reproduce byte for byte. PNG hashes are checked too; another Pillow version may encode identical pixels differently and intentionally fail the strict file check.

`decode-textures.py` reconstructs Xbox 360 tiled BC1/2/3 data, swaps 16-bit words and writes the original base mip. The tile-address transform is adapted from [MIT XNFSTPKTool](https://github.com/xan1242/xnfstpktool/blob/bfd46d4e71df7a23db4f4e43c51aa37db2839fee/TPKTool/TPKTool.h); its notice is retained in `XNFSTPKTool-LICENSE.txt`. QuickBMS handles HUFF for four traffic TPKs. Only selected source pixels are decoded.

`decode-geometry.cjs` reads measured mixed-endian console geometry: little-endian chunks/material tables, big-endian positions/UVs/indices, packed normals. The PC hierarchy was cross-checked against [NFS-ModTools](https://github.com/NFSTools/NFS-ModTools/tree/897c170eececb6f0f31c1925c2db4160d135c3b5/Common/Geometry); the console vertex/material decoder is new code. Driver image cards are skipped.

`build-glb.cjs` preserves original LOD B triangles, UVs, normals and tire meshes. It changes coordinates to +Z forward/+Y up. Four wheel mounts are fitted to visible arches, rather than claimed as recovered VLT locators. Material batching and PBR bindings are NOMERA adaptations. Glass is inexpensive opaque tinted PBR. Four police dynamic lamp slots have documented bindings to original ON/OFF maps. Original console shaders and dynamic texture-swap logic were not ported.

The original EA meshes and pixels remain game assets, separate from the MIT tool code. This work is a local integration; no publication or upload was performed.
