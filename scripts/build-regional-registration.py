"""Screen reconstructions guided by regional plate samples, not factory die files.
Run with fonttools/brotli and Pillow, --rounded pointing to MPLUSRounded1c-Medium.ttf.
TRM is optional for locally rendered Yokohama output; font data is never shipped.
"""
from pathlib import Path
import argparse, re, base64
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image,ImageFont,ImageDraw
root=Path(__file__).resolve().parent.parent
args=argparse.ArgumentParser();args.add_argument('--rounded',required=True);args.add_argument('--trm');a=args.parse_args()
env={'__file__':str(root/'scripts/build-national-plate-fonts.py')};exec((root/'scripts/build-national-plate-fonts.py').read_text(encoding='utf-8').split('for country,width')[0],env);base=env['base']
# Independent rounded bowls and condensed numerals; no FE-Schrift substitution.
digits={
'0':(58,'M29 0C8 0 0 16 0 50S8 100 29 100S58 84 58 50S50 0 29 0ZM29 14C40 14 43 26 43 50S40 86 29 86S15 74 15 50S18 14 29 14Z'),
'1':(42,'M0 19L22 0H36V100H20V20L7 32Z'),
'2':(58,'M0 25C1 8 13 0 29 0S58 9 58 27C58 40 50 50 38 65L20 85H58V100H0V86L27 55C37 44 43 35 43 27C43 18 37 14 29 14S15 18 15 27Z'),
'3':(58,'M1 23C4 6 15 0 30 0C49 0 57 12 57 27C57 37 53 44 44 49C54 53 58 61 58 73C58 90 47 100 29 100C12 100 1 91 0 76L15 73C17 82 21 86 29 86C39 86 43 81 43 72C43 61 38 56 25 56H20V42H25C37 42 42 37 42 28C42 19 38 14 30 14C21 14 17 19 15 26Z'),
'4':(60,'M34 0H50L19 60H40V35H55V60H60V75H55V100H40V75H0V61Z'),
'5':(58,'M3 0H56V15H18V39C22 36 27 35 31 35C48 35 58 47 58 67C58 89 47 100 29 100C12 100 2 91 0 76L15 73C17 82 21 86 29 86C39 86 43 80 43 68C43 56 38 50 29 50C23 50 20 53 17 58H2Z'),
'6':(58,'M55 22L41 27C39 18 35 14 28 14C17 14 14 27 14 44C19 38 24 35 31 35C49 35 58 48 58 67C58 88 48 100 29 100C9 100 0 84 0 51C0 17 8 0 29 0C43 0 52 7 55 22ZM29 50C20 50 15 56 15 67C15 79 20 86 29 86S43 79 43 67S39 50 29 50Z'),
'7':(58,'M0 0H58V15L24 100H7L40 15H0Z'),
'8':(58,'M29 0C10 0 1 11 1 27C1 38 5 45 13 49C4 54 0 63 0 74C0 91 10 100 29 100S58 91 58 74C58 63 54 54 45 49C53 45 57 38 57 27C57 11 48 0 29 0ZM29 14C38 14 42 19 42 28S38 41 29 41S16 37 16 28S20 14 29 14ZM29 56C39 56 43 63 43 73S39 86 29 86S15 83 15 73S19 56 29 56Z'),
'9':(58,'M3 78L17 73C19 82 23 86 30 86C41 86 44 73 44 56C39 62 34 65 27 65C9 65 0 52 0 33C0 12 10 0 29 0C49 0 58 16 58 49C58 83 50 100 29 100C15 100 6 93 3 78ZM29 50C38 50 43 44 43 33C43 21 38 14 29 14S15 21 15 33S19 50 29 50Z')}
for country,scale in [('KZ',.95),('AE',.65)]:
 paths={**base,**digits}
 if country=='AE':paths['1']=(25,'M6 0H23V100H6Z')
 order=['.notdef','space']+list(paths);glyphs={};metrics={'.notdef':(600,0),'space':(220,0)}
 for name in order:
  pen=TTGlyphPen(None)
  if name in paths:
   w,d=paths[name];parse_path(d,TransformPen(Cu2QuPen(pen,1,reverse_direction=False),(10*scale,0,0,-10,0,1000)));metrics[name]=(round((w+10)*10*scale),0)
  glyphs[name]=pen.glyph()
 fb=FontBuilder(1000,isTTF=True);fb.setupGlyphOrder(order);fb.setupCharacterMap({**{ord(k):k for k in paths},32:'space'});fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=1000,descent=0,lineGap=0);family='Nomera Regional '+country;fb.setupNameTable({'familyName':family,'styleName':'Regular','fullName':family,'psName':family.replace(' ',''),'version':'Version 2.0'});fb.setupOS2(sTypoAscender=1000,sTypoDescender=0,sTypoLineGap=0,usWinAscent=1000,usWinDescent=0,sCapHeight=1000,fsType=0);fb.setupPost();fb.setupMaxp();fb.font.flavor='woff2';fb.font.recalcTimestamp=False;fb.font['head'].created=fb.font['head'].modified=3800000000;fb.save(root/f'assets/fonts/nomera-regional-{country.lower()}.woff2')
# Static outlined labels: no runtime CJK font download for these ten known names.
f=TTFont(a.rounded);glyphs=f.getGlyphSet();cmap=f.getBestCmap();target=root/'assets/registration';target.mkdir(exist_ok=True)
regions={'TKY':('品川',80),'YKH':('横浜',80),'OSK':('なにわ',90),'NGY':('名古屋',90),'SPR':('札幌',80),'FKO':('福岡',80),'KBE':('神戸',80),'KYO':('京都',80),'CHB':('千葉',80),'STM':('大宮',80)}

classes={'TKY':'330','YKH':'300','OSK':'330','NGY':'350','SPR':'301','FKO':'330','KBE':'302','KYO':'310','CHB':'320','STM':'300'}
for code,(word,width) in regions.items():
 paths=[];step=width/len(word)
 for i,c in enumerate(word+classes[code]):
  if i<len(word): x=i*step+1;gw=step-2
  else: x=width+8+(i-len(word))*27;gw=25
  g=glyphs[cmap[ord(c)]];b=BoundsPen(glyphs);g.draw(b);x0,y0,x1,y1=b.bounds;pen=SVGPathPen(glyphs);g.draw(TransformPen(pen,(gw/(x1-x0),0,0,-40/(y1-y0),x-x0*gw/(x1-x0),y1*40/(y1-y0))));d=re.sub(r'-?\d+\.\d+',lambda m: ('%.2f'%float(m[0])).rstrip('0').rstrip('.'),pen.getCommands());paths.append('<path d="'+d+'"/>')
 if code=='YKH' and a.trm:
  font=ImageFont.truetype(a.trm,400);im=Image.new('RGBA',(160,80))
  for i,c in enumerate(word):
   b=font.getbbox(c);tile=Image.new('RGBA',(b[2]-b[0],b[3]-b[1]));ImageDraw.Draw(tile).text((-b[0],-b[1]),c,font=font,fill='#174d39');im.alpha_composite(tile.resize((78,80),Image.Resampling.LANCZOS),(i*80+1,0))
  import io
  data=io.BytesIO();im.save(data,format='PNG',optimize=True)
  paths[:len(word)]=['<image width="80" height="40" href="data:image/png;base64,'+base64.b64encode(data.getvalue()).decode()+'"/>']
 (target/('jp-'+code.lower()+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" width="'+str(width+89)+'" height="40" viewBox="0 0 '+str(width+89)+' 40" fill="#174d39">'+''.join(paths)+'</svg>',encoding='utf-8')
print('Built two serial fonts and ten individually fitted Japanese region headers')
