"""Original screen dies and vector state artwork. See AUTHORS_US_STATE_PLATES.md.
Static labels are outlined from local fonts; no system font data is distributed.
"""
from pathlib import Path
import re,math
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
root=Path(__file__).resolve().parent.parent
env={'__file__':str(root/'scripts/build-national-plate-fonts.py')};exec((root/'scripts/build-national-plate-fonts.py').read_text(encoding='utf-8').split('for country,width')[0],env);base=env['base']
# US Y is a fork, not the Cyrillic-U die in the Russian source alphabet.
base['Y']=(68,'M0 0H17L34 38L51 0H68L42 58V100H26V58Z')
base['9']=(62,'M31 0C11 0 0 13 0 33C0 54 13 66 31 66C36 66 41 65 46 61C44 77 39 85 29 85C22 85 17 81 15 75L1 79C5 93 15 100 30 100C52 100 62 81 62 49C62 17 52 0 31 0ZM31 15C41 15 46 22 46 33S41 51 31 51S16 44 16 33S21 15 31 15Z')
for kind,scale in [('East',.74),('South',.64),('Texas',.56),('Vintage',.78)]:
 paths=dict(base)
 if kind in ('East','Texas'):
  paths.update({'0':(58,'M14 0H44L58 15V85L44 100H14L0 85V15ZM19 15L15 20V80L19 85H39L43 80V20L39 15Z'),'O':(62,'M14 0H48L62 15V85L48 100H14L0 85V15ZM20 16L16 20V80L20 84H42L46 80V20L42 16Z'),'C':(62,'M14 0H48L62 15V28H46V21L41 16H21L16 21V79L21 84H41L46 79V72H62V85L48 100H14L0 85V15Z'),'G':(62,'M14 0H48L62 15V28H46V21L41 16H21L16 21V79L21 84H41L46 79V61H31V46H62V85L48 100H14L0 85V15Z'),'2':(58,'M0 15L14 0H44L58 15V35L16 82V85H58V100H0V79L42 32V21L37 16H21L16 21V29H0Z'),'7':(58,'M0 0H58V16L27 100H10L41 16H0Z')})
 if kind=='Texas':paths['1']=(34,'M0 16L17 0H32V100H16V22L0 34Z')
 if kind=='Vintage':paths['1']=(48,'M2 20L22 0H35V86H48V100H0V86H19V23L9 32Z')
 if kind=='South':paths['1']=(34,'M0 16L17 0H31V100H16V22L0 34Z')
 order=['.notdef','space']+list(paths);glyphs={};metrics={'.notdef':(600,0),'space':(150,0)}
 for name in order:
  p=TTGlyphPen(None)
  if name in paths:
   w,d=paths[name];parse_path(d,TransformPen(Cu2QuPen(p,1,reverse_direction=False),(10*scale,0,0,-10,0,1000)));metrics[name]=(round((w+10)*10*scale),0)
  glyphs[name]=p.glyph()
 fb=FontBuilder(1000,isTTF=True);fb.setupGlyphOrder(order);fb.setupCharacterMap({**{ord(k):k for k in paths},32:'space'});fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=1000,descent=0,lineGap=0);family='Nomera US '+kind;fb.setupNameTable({'familyName':family,'styleName':'Regular','fullName':family,'psName':family.replace(' ',''),'version':'Version 1.0'});fb.setupOS2(sTypoAscender=1000,sTypoDescender=0,sTypoLineGap=0,usWinAscent=1000,usWinDescent=0,sCapHeight=1000,fsType=0);fb.setupPost();fb.setupMaxp();fb.font.flavor='woff2';fb.font['head'].created=fb.font['head'].modified=3800000000;fb.font.recalcTimestamp=False;fb.save(root/f'assets/fonts/nomera-us-{kind.lower()}.woff2')
fontcache={}
def label(word,x,y,w,h,font='arialbd.ttf',fill='#172a3a'):
 file=root/'assets/fonts/nomera-ca-title.woff2' if font=='ca' else Path('C:/Windows/Fonts')/font
 if str(file) not in fontcache:fontcache[str(file)]=TTFont(file)
 f=fontcache[str(file)];gs=f.getGlyphSet();cm=f.getBestCmap();pen=SVGPathPen(gs);advance=0
 for c in word:
  g=gs[cm[ord(c)]];g.draw(TransformPen(pen,(1,0,0,1,advance,0)));advance+=g.width
 d=pen.getCommands();b=BoundsPen(gs);parse_path(d,b);x0,y0,x1,y1=b.bounds;sx=w/(x1-x0);sy=h/(y1-y0)
 # Keep short captions proportionate within the allocated width.
 sx=min(sx,sy*1.2)
 return f'<path fill="{fill}" transform="translate({x+w/2-(x1+x0)*sx/2:.3f} {y+y1*sy:.3f}) scale({sx:.5f} {-sy:.5f})" d="{d}"/>'
# Graphic accents are independent, simplified reconstructions of the selected state designs.
white='#fafbf8';art={}
art['CA']=label('California',74,6,157,30,'ca','#b9293b')+label('dmv.ca.gov',115,138,75,7,'arial.ttf','#b9293b')
art['TX']='<path d="M20 9 23 18 32 18 25 24 28 33 20 27 12 33 15 24 8 18 17 18Z" fill="#121719"/>'+label('TEXAS',91,9,124,22,fill='#101719')+label('The Lone Star State',77,138,152,8,fill='#101719')
art['NJ']='<defs><linearGradient id="nj" x2="0" y2="1"><stop stop-color="#ffe963"/><stop offset="1" stop-color="#fff9d6"/></linearGradient></defs><rect width="305" height="153" fill="url(#nj)"/>'+label('New Jersey',68,8,171,25,'timesbd.ttf','#171c1a')+label('Garden State',90,135,125,15,fill='#171c1a')+'<path fill="#77734c" opacity=".6" d="m150 71 7 4-1 5 4 3-7 8-3 9-6 4-5-4 6-8-1-7 4-3-2-6Z"/>'
art['MI']='<rect width="305" height="153" fill="#153e60"/>'+label('MICHIGAN',70,10,165,20,fill='#f3ce5a')+label('WATER - WINTER WONDERLAND',41,136,223,10,fill='#f3ce5a')
art['WA']='<path fill="#9ad7ea" d="M0 139 34 120 64 116 86 99 108 88 129 62 143 51 154 52 163 48 179 55 196 77 225 95 250 108 279 118 305 133V153H0Z"/><path fill="#fff" d="m95 101 34-39 14-11 10 1 10-4 16 7 17 22-19-12-4 19-13-16-7 17-6-19-12 8-4 23-11-2-11 13Z"/>'+label('WASHINGTON',20,17,177,18,fill='#b72533')+label('EVERGREEN STATE',73,137,160,11,fill='#b72533')
art['FL']='<path opacity=".2" fill="#bad3a5" d="m91 49 60-4 10 9-5 12 15 13 4 18 14 19 2 12-8 2-16-18-10-13-4-23-15-11-31-1-18-9Z"/><g opacity=".55"><circle cx="146" cy="85" r="21" fill="#efac48"/><circle cx="164" cy="91" r="19" fill="#ef983b"/><path d="m143 63q23-27 39-8-19 13-39 8" fill="#4e914c"/></g>'+label('MYFLORIDA.COM',62,9,181,19,fill='#286544')+label('SUNSHINE STATE',73,136,159,12,fill='#286544')
art['GA']='<g opacity=".58"><path fill="#eaaa80" d="M155 70c-18-16-36 1-29 28 7 22 26 28 33 17 15 10 35-17 25-35-6-12-17-15-29-10Z"/><path fill="#b8d6bd" d="m154 68q5-27 27-17-4 19-27 17"/><path d="m155 72q10 21 0 45" fill="none" stroke="#cf865d"/></g>'+label('GEORGIA',75,7,155,24,'timesbd.ttf','#141a18')+label('IN GOD WE TRUST',83,137,139,11,fill='#141a18')
art['NY']='<g fill="#b4c5cf"><path d="M0 130 20 122 27 126 40 116 57 127 73 119 85 131H105V153H0Z"/><path d="M194 138V122h7v-15h3v15h6v11h5v-22h7V96h4v15h6v22h6v-13h10v18h7v-20h6v-10h3v10h7v20h5v-28h4v-11h4v11h7v28h15v15H190Z"/><path d="m109 145 4-29 2-5-1-10 3-2 3 5-1 12 4 29Zm6-34-9-15 2-2 9 11Zm-9-16 1-11h2v11Z"/><path d="m280 135 3-17h7l3 17Zm2-18 5-4 5 4Z"/></g>'+label('NEW YORK',64,9,177,23,fill='#183e67')+label('EXCELSIOR',112,137,80,10,'timesbd.ttf','#a4823f')
# Faceted mountain/desert graphic rather than a generic blue strip.
art['NV']='<rect width="305" height="153" fill="#a6cadc"/><path fill="#edf2f1" d="M0 102 22 90 36 98 60 84 82 101 109 91 136 106 160 92 193 106 220 93 246 102 272 95 305 113V153H0Z"/>'
colors=['#cecbb0','#b6bba1','#e2d392','#d4ba78','#e8cd90','#f0b25d','#ee9b49','#c3c4a1']
for i in range(13):
 x=i*25-5;y=117+(i%3)*5;art['NV']+=f'<path fill="{colors[i%8]}" d="M{x} {y} {x+25} {y-13} {x+40} 153 {x-7} 153Z"/>'
art['NV']+=label('NEVADA',74,9,158,22,'timesbd.ttf','#111b24')+label('Home Means Nevada',61,136,183,12,'timesbd.ttf','#111b24')
art['IL']='<defs><linearGradient id="il" x2="0" y2="1"><stop stop-color="#b5dbe8"/><stop offset=".58" stop-color="#f8faf6"/></linearGradient></defs><rect width="305" height="153" fill="url(#il)"/><g fill="#7c9aaa" opacity=".55"><path d="M172 142v-29h10V99h5v14h7v24h7v-35h8V82h4v20h9v35h8v-18h12V94h3v25h8v18h7v-23h12v28h33v11H160Z"/><path d="M35 151v-25l4-14-7-7-1-15 5-17 10-8 13 2 7 11-2 11 4 7-4 4-2 10 5 8 8 7 9 26Z"/></g><path d="M0 143h305v10H0Z" fill="#bfcab1"/>'+label('ILLINOIS',93,8,128,19,fill='#20456e')+label('LAND OF LINCOLN',105,32,106,7,fill='#284563')
for code,body in art.items():
 svg='<svg xmlns="http://www.w3.org/2000/svg" width="304.8" height="152.4" viewBox="0 0 304.8 152.4"><rect width="305" height="153" fill="'+white+'"/>'+body+'<rect x="3" y="3" width="298.8" height="146.4" rx="6" fill="none" stroke="'+('#f3ce5a' if code=='MI' else '#a0adb1')+'" stroke-width=".65"/></svg>'
 # Round floats in the outlined label paths to reduce transfer cost.
 svg=re.sub(r'-?\d+\.\d{4,}',lambda m:f'{float(m[0]):.3f}'.rstrip('0').rstrip('.'),svg)
 (root/f'assets/registration/us-{code.lower()}.svg').write_text(svg,encoding='utf-8')
print('Built four original serial dies and ten state backgrounds')
