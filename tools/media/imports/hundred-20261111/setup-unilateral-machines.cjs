const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',source='tools/media/imports/popular-three-b16-20261110';
const configs={'single-arm-machine-chest-press':'machine-chest-press','single-arm-machine-shoulder-press':'machine-shoulder-press','single-arm-pec-deck-fly':'pec-deck'},batch=JSON.parse(fs.readFileSync(base+'/batch.json'));
for(const [id,original]of Object.entries(configs)){
 const e=batch.entries.find(x=>x.id===id);assert.equal(e.status,'awaiting-motion-implementation');
 let m=fs.readFileSync(source+'/machine-chest-press-motion.mjs','utf8');m=m.replace("export const exercises=['machine-chest-press','machine-shoulder-press','pec-deck'];",'export const exercises='+JSON.stringify([id])+';');
 m=m.replace("export function machineTarget(id,lift,side){","export function machineTarget(id,lift,side){id="+JSON.stringify(original)+";if(side==='R')lift=0;");
 m=m.replace("export function applyMotion(id,lift,{byName,dataByName,mesh}){","export function applyMotion(id,lift,{byName,dataByName,mesh}){id="+JSON.stringify(original)+";const activeLift=lift;");
 m=m.replace("for(const side of ['L','R']){","for(const side of ['L','R']){const lift=side==='L'?activeLift:0;");
 let s=fs.readFileSync(source+'/machine-chest-press-studio.mjs','utf8');s=s.replaceAll("exercise==='machine-chest-press'",JSON.stringify(original)+"==='machine-chest-press'").replaceAll("exercise==='machine-shoulder-press'",JSON.stringify(original)+"==='machine-shoulder-press'").replaceAll("exercise==='pec-deck'",JSON.stringify(original)+"==='pec-deck'");
 fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);e.status='motion-preview';e.recipe={family:original,sourceUrls:[original==='machine-shoulder-press'?'https://www.technogym.com/en-GB/product/artis-shoulder-press_MK69EH.html':'https://www.technogym.com/en-US/product/selection-700-chest-press_MNFC.html'],criteria:'Seated independent left-arm '+original+' with right arm and lever stationary; fixed seat/back/feet, closed grip and constant lever length.',sourcesCheckedAt:'2026-11-12'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');fs.writeFileSync(base+'/unilateral-machines-ids.json',JSON.stringify(Object.keys(configs),null,2)+'\n');
