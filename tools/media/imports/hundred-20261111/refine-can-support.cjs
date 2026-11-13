const fs=require('node:fs'),base='tools/media/imports/hundred-20261111/';
for(const id of ['full-can-raise','empty-can-raise']){const p=base+id+'-motion.mjs';let s=fs.readFileSync(p,'utf8');if(s.includes('position.y += .28'))throw Error('Already adjusted');s=s.replace("  for(const side of ['L','R']){","  byName.root.position.y += .28; for(const side of ['L','R']){");fs.writeFileSync(p,s);}
