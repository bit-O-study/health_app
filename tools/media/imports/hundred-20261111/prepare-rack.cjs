const fs=require('fs');
const base='tools/media/imports/hundred-20261111';
const jobs=[['double-kettlebell-press','kettlebell-press','popular-three-b18-20261110'],['dumbbell-front-squat','kettlebell-front-squat','popular-three-b19-20261110']];
for(const [id,original,folder]of jobs){
 const batch=JSON.parse(fs.readFileSync(base+'/batch.json','utf8')),entry=batch.entries.find(e=>e.id===id);
 if(entry.status!=='awaiting-motion-implementation')continue;
 const source='tools/media/imports/'+folder;
 let motion=fs.readFileSync(source+'/'+original+'-motion.mjs','utf8').replaceAll(original,id),studio=fs.readFileSync(source+'/'+original+'-studio.mjs','utf8').replaceAll(original,id);
 if(id==='double-kettlebell-press'){
  motion=motion.replace("active=!lat&&!add&&side==='L'","active=!lat&&!add").replace('v([2.8,6.7+5.72*lift,1.7-1.2*lift])','v([sign*2.8,6.7+5.62*lift,1.7-1.2*lift])');
  studio=studio.replace('bell,aligned=false','bell,secondBell,aligned=false');
  const hook='function support()';
  studio=studio.replace(hook,"if(bell){secondBell=bell.clone(true);secondBell.scale.x=-1;scene.add(secondBell);}\n"+hook);
  studio=studio.replace('bell.rotation.y=0;','bell.rotation.y=0;if(secondBell)secondBell.position.copy(grips[1].grip);');
  entry.recipe={family:'standing-press',sourceBatch:source,criteria:'Both kettlebells press together from the rack to overhead; feet and trunk remain fixed.'};
 }else{
  const start=studio.indexOf('if(!lat&&!chair)for(const sign'),end=studio.indexOf('function support()',start);
  if(start<0||end<0)throw Error('Equipment hook');
  studio=studio.slice(0,start)+`if(!lat&&!chair)for(const sign of [1,-1]){const bell=new THREE.Group();scene.add(bell);const grip=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.1,24),metal);grip.rotation.x=Math.PI/2;bell.add(grip);for(const z of [-.9,.9]){const head=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.45,6),rubber);head.rotation.x=Math.PI/2;head.position.z=z;bell.add(head);}bells.push(bell);}\n`+studio.slice(end);
  entry.recipe={family:'front-squat',sourceBatch:source,criteria:'Two dumbbells held at the shoulders with a neutral grip, fixed feet, controlled squat to near parallel.'};
 }
 fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);
 entry.status='ready-for-preview';fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2));console.log(id+' prepared');
}
