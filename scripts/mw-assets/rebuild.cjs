// Read local archives only; recreate selected assets in a new ignored work folder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const [source,quickbms,bms,python='python',destination='work/mw-reimport']=process.argv.slice(2);
if(!source||!quickbms||!bms)throw Error('Usage: node scripts/mw-assets/rebuild.cjs sourceRoot quickbms.exe nfsu_bun.bms [python.exe] [newOutputDir]');
const manifest=require('../../assets/authors-mw/provenance.json'),out=path.resolve(destination),traffic=path.join(out,'traffic');
if(fs.existsSync(out))throw Error('Choose a new output directory: '+out);
fs.mkdirSync(traffic,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const model of manifest.models)for(const entry of model.sourceEntries){
 const fd=fs.openSync(path.join(source,entry.archive),'r'),b=Buffer.alloc(entry.size);
 try{const n=fs.readSync(fd,b,0,b.length,entry.offset);if(n!==b.length||hash(b)!==entry.sha256)throw Error('Source hash mismatch: '+entry.name);}finally{fs.closeSync(fd);}
 fs.writeFileSync(path.join(traffic,model.id+'_'+entry.name.split('\\').at(-1)),b);
}
execFileSync(python,[path.join(__dirname,'decode-textures.py'),path.resolve(source),path.join(out,'textures'),path.resolve(quickbms),path.resolve(bms)],{stdio:'inherit'});
for(const script of ['decode-geometry.cjs','build-glb.cjs'])execFileSync(process.execPath,[path.join(__dirname,script),traffic],{stdio:'inherit'});
for(const model of manifest.models)if(hash(fs.readFileSync(path.join(traffic,path.basename(model.file))))!==model.sha256)throw Error('GLB hash mismatch: '+model.id);
console.log('Four original GLBs reproduced byte for byte. Output: '+out);
