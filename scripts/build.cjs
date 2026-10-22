'use strict';
// Public web directory contains only client assets. Never publish source, functions or secrets.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
for(const name of ['index.html','test.html','styles.css','manifest.json','sw.js']){
  fs.copyFileSync(path.join(root,name),path.join(dist,name));
}
for(const folder of ['js','icons','assets']) {
  if (fs.existsSync(path.join(root, folder))) {
    fs.cpSync(path.join(root,folder),path.join(dist,folder),{recursive:true});
  }
}
console.log('Clean public dist ready. Private server code stays outside publish directory.');
if(process.argv.includes('--authors')){
  for(const name of ['authors.html','authors-legacy.css','authors.css','authors-expansion.css','authors-secondary.css','authors-plate-effects.css','authors-rewards.css','authors-refinement.css','authors-motorsport.css','authors-workshop.css','authors-prestige.css','authors-atelier.css','authors-garage.css'])fs.copyFileSync(path.join(root,name),path.join(dist,name));
  console.log('Author’s Edition included at /authors.html (local build only).');
}
