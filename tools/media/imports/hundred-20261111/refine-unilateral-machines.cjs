const fs=require('node:fs'),base='tools/media/imports/hundred-20261111';
for(const id of JSON.parse(fs.readFileSync(base+'/unilateral-machines-ids.json'))){const p=base+'/'+id+'-studio.mjs';let s=fs.readFileSync(p,'utf8');s=s.replace(/  if\(exercise\.startsWith\('single-arm-'\)&&side==='R'\)\{[\s\S]*?\n  \}/,'');fs.writeFileSync(p,s);}
