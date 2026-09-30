from PIL import Image,ImageOps
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[3]
SRC=Path(__import__('sys').argv[1])
OUT=ROOT/'shared/assets/photos/v2';OUT.mkdir(parents=True,exist_ok=True)
# Crops exclude scan borders. Original scans remain untouched.
items={
 'aerea':('FB_IMG_1748845894583.jpg',(0,.03,1,1),(988,717)),
 'canal':('119_MA_1.jpg',(.045,.06,.955,.96),(1415,1815)),
 'relieve':('la punta de la ballena.jpg',(0,.34,1,.964),(2000,932)),
 'abra':('114_MA_1.jpg',(.10,.14,.91,.88),(1563,1013)),
 'rompiente':('117_MA_1.jpg',(.025,.07,.98,.83),(1876,1012)),
 'rinconada':('1930 rinconada.jpg',(.024,.10,.93,.88),(3030,1710)),
 'gruta':('1957 2.jpg',(.135,.115,.86,.88),(1600,2400)),
 'estratos':('115_MA_1.jpg',(.10,.145,.905,.88),(1552,1004)),
 'playa':('409_MA_1.jpg',(.09,.05,.965,.965),(1786,1815)),
}
manifest=[]
for key,(name,box,size) in items.items():
 im=Image.open(SRC/name).convert('RGB');w,h=im.size
 crop=im.crop(tuple(round(v*(w if i%2==0 else h)) for i,v in enumerate(box)))
 crop=ImageOps.fit(crop,size,method=Image.Resampling.LANCZOS)
 crop.save(OUT/(key+'.jpg'),quality=95)
 manifest.append(dict(id=key,source=name,sourceScope='input-directory',crop=box,size=size,method='normalized crop (round), ImageOps.fit Lanczos',renderCopies=[] if key=='relieve' else ['portezuelo'] if key=='rinconada' else [key],author='No verificado; archivo aportado por el usuario',license='No verificada; no publicar archivo en repositorio'))
yerbal=ROOT/'privado/commons/quebrada_tornasoloriental.jpg'
if yerbal.exists():
 ImageOps.fit(Image.open(yerbal).convert('RGB'),(1010,720),method=Image.Resampling.LANCZOS).save(OUT/'yerbal.jpg',quality=95)
 manifest.append(dict(id='yerbal',source='privado/commons/quebrada_tornasoloriental.jpg',sourceScope='repository',size=[1010,720],method='ImageOps.fit Lanczos centered',renderCopies=['yerbal'],author='Tornasoloriental',license='CC BY-SA 3.0',licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/',sourceUrl='https://commons.wikimedia.org/wiki/File:Quebrada_de_Los_Cuervos.jpg'))
yaguaron=ROOT/'privado/commons/yaguaron_bienflorencia.jpg'
if yaguaron.exists():
 Image.open(yaguaron).crop((0,0,2460,2432)).resize((1942,1920),Image.Resampling.LANCZOS).save(OUT/'yaguaron.jpg',quality=95)
 manifest.append(dict(id='yaguaron',source='privado/commons/yaguaron_bienflorencia.jpg',sourceScope='repository',cropPixels=[0,0,2460,2432],size=[1942,1920],method='pixel crop, resize Lanczos',renderCopies=['yaguaron'],author='Bienflorencia',license='CC BY-SA 4.0',licenseUrl='https://creativecommons.org/licenses/by-sa/4.0/',sourceUrl='https://commons.wikimedia.org/wiki/File:R%C3%ADo_Yaguar%C3%B3n.jpg'))
aerial=SRC.parent/'151482.jpg'
if aerial.exists():
 im=Image.open(aerial);w,h=im.size
 im.crop((int(w*.02),int(h*.07),int(w*.95),int(h*.915))).resize((988,717),Image.Resampling.LANCZOS).save(OUT/'aerea.jpg',quality=95)
 next(row for row in manifest if row['id']=='aerea').update(source='../151482.jpg',crop=[.02,.07,.95,.915],method='normalized crop (floor), resize Lanczos',renderCopies=['aerea','relieve'])
else:
 print('AVISO: falta',aerial,'; se conserva la aérea alternativa, que requiere revisión.')
 next(row for row in manifest if row['id']=='aerea')['renderCopies']=['aerea','relieve']
# Registrar únicamente después de todas las sustituciones: origen y hash del JPG final.
for row in manifest:
 output=OUT/(row['id']+'.jpg')
 row['output']=output.relative_to(ROOT).as_posix()
 row['sha256']=hashlib.sha256(output.read_bytes()).hexdigest()
 row['bytes']=output.stat().st_size
manifest_path=ROOT/'privado/manifest_local.json'
manifest_path.parent.mkdir(parents=True,exist_ok=True)
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('Preparadas',len(manifest),'copias en',OUT,'; manifiesto:',manifest_path)
