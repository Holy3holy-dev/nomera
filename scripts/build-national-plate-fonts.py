"""Original compact serial outlines; Noto/Mr Dafoe labels are OFL subsets.
The registration outlines approximate photographed dies, not production masters.
Source downloads live in ignored work/rims-national-plates; runtime uses WOFF2 only.
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

root=Path(__file__).resolve().parent.parent
env={}
exec((root/'scripts/build-russian-plate-font.py').read_text(encoding='utf-8').split("order=['.notdef'")[0],env)
base=env['paths']
base.update({
'D':(66,'M0 0H30Q66 0 66 35V65Q66 100 30 100H0ZM16 16V84H30Q50 84 50 65V35Q50 16 30 16Z'),
'F':(62,'M0 0H62V16H16V42H56V58H16V100H0Z'),
'G':(72,'M36 0Q0 0 0 35V65Q0 100 36 100Q72 100 72 66V44H36V60H56V66Q56 84 36 84Q16 84 16 65V35Q16 16 36 16Q50 16 55 29L71 22Q64 0 36 0Z'),
'I':(40,'M0 0H40V16H28V84H40V100H0V84H12V16H0Z'),
'J':(60,'M44 0H60V68Q60 100 29 100Q0 100 0 73H16Q16 84 29 84Q44 84 44 68Z'),
'L':(60,'M0 0H16V84H60V100H0Z'),
'N':(70,'M0 0H16L54 68V0H70V100H54L16 32V100H0Z'),
'Q':(80,'M40 0Q0 0 0 35V65Q0 100 40 100Q80 100 80 65V35Q80 0 40 0ZM40 16Q64 16 64 35V65Q64 84 40 84Q16 84 16 65V35Q16 16 40 16ZM43 62H60L80 100H63Z'),
'V':(72,'M0 0H17L36 76L55 0H72L45 100H27Z'),
'W':(92,'M0 0H16L25 70L38 20H54L67 70L76 0H92L77 100H59L46 51L33 100H15Z'),
'Z':(64,'M0 0H64V16L20 84H64V100H0V84L44 16H0Z'),
'-':(45,'M0 44H45V57H0Z')})
for country,width in [('US',.78),('KZ',.89),('JP',.90),('AE',.83)]:
 paths=dict(base)
 # Narrow, flat-sided stamped zero used by the US/Emirates serial families.
 if country in ('US','AE','JP'):
  paths['0']=(60,'M17 0H43Q60 0 60 18V82Q60 100 43 100H17Q0 100 0 82V18Q0 0 17 0ZM20 15Q15 15 15 22V78Q15 85 20 85H40Q45 85 45 78V22Q45 15 40 15Z')
  paths['1']=(44,'M0 18L22 0H35V100H19V22L7 32Z')
 if country=='JP':
  paths['7']=(58,'M0 0H58V18L30 100H13L41 16H15V36H0Z')
 if country=='KZ':
  paths['Q']=(80,'M40 0Q0 0 0 35V65Q0 100 40 100Q80 100 80 65V35Q80 0 40 0ZM40 16Q64 16 64 35V65Q64 84 40 84Q16 84 16 65V35Q16 16 40 16ZM48 71H65L80 100H63Z')
 order=['.notdef','space']+list(paths);glyphs={};metrics={'.notdef':(600,0),'space':(240,0)}
 for name in order:
  pen=TTGlyphPen(None)
  if name in paths:
   w,d=paths[name];matrix=(-10*width,0,0,10,w*10*width,0) if name=='9' else (10*width,0,0,-10,0,1000)
   parse_path(d,TransformPen(Cu2QuPen(pen,1,reverse_direction=False),matrix));metrics[name]=(round((w+8)*10*width),0)
  glyphs[name]=pen.glyph()
 fb=FontBuilder(1000,isTTF=True);fb.setupGlyphOrder(order);fb.setupCharacterMap({**{ord(k):k for k in paths},32:'space'});fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=1000,descent=0,lineGap=0)
 family='Nomera Registration '+country
 fb.setupNameTable({'familyName':family,'styleName':'Regular','uniqueFontIdentifier':family+'-1','fullName':family,'psName':family.replace(' ',''),'version':'Version 1.0'});fb.setupOS2(sTypoAscender=1000,sTypoDescender=0,sTypoLineGap=0,usWinAscent=1000,usWinDescent=0,sCapHeight=1000,fsType=0);fb.setupPost();fb.setupMaxp();fb.font['head'].created=fb.font['head'].modified=3800000000;fb.font.recalcTimestamp=False;fb.font.flavor='woff2';fb.save(root/f'assets/fonts/nomera-registration-{country.lower()}.woff2')

labels={
'noto-jp.ttf':('nomera-jp-labels.woff2','品川東横浜神なにわ大名古屋愛札幌福岡戸兵京都千葉宮埼あいうえかきくけこさすせそたちつてとなぬねのはひふほまみむめもやゆよらりるろれわを0123456789・- ',{'wght':600}),
'noto-ar.ttf':('nomera-ar-labels.woff2','دبيأبوظشارقةعجمانرأسالخيمةفجوين0123456789 ',{'wght':600,'wdth':100}),
'ca-script.ttf':('nomera-ca-title.woff2','California',{})}
for source,(output,text,axes) in labels.items():
 f=TTFont(root/'work/rims-national-plates'/source)
 if 'fvar' in f:f=instantiateVariableFont(f,axes,inplace=True)
 options=subset.Options();options.flavor='woff2';options.layout_features=['*'];sub=subset.Subsetter(options);sub.populate(text=text);sub.subset(f)
 family={'noto-jp.ttf':'Nomera Japanese Labels','noto-ar.ttf':'Nomera Arabic Labels','ca-script.ttf':'Nomera California Title'}[source]
 for record in f['name'].names:
  if record.nameID in (1,3,4,6,16):
   value=family.replace(' ','') if record.nameID==6 else family
   record.string=value.encode(record.getEncoding())
 f.flavor='woff2';f.recalcTimestamp=False;f['head'].created=f['head'].modified=3800000000;f.save(root/'assets/fonts'/output)
 print(output,(root/'assets/fonts'/output).stat().st_size)
