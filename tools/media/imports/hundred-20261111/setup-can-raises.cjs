const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',source='tools/media/imports/popular-three-b6-20261104';
const batch=JSON.parse(fs.readFileSync(base+'/batch.json'));
for(const id of ['full-can-raise','empty-can-raise']){
 const entry=batch.entries.find(e=>e.id===id);assert.equal(entry.status,'awaiting-motion-implementation');
 let m=fs.readFileSync(source+'/lateral-raise-motion.mjs','utf8'),s=fs.readFileSync(source+'/lateral-raise-studio.mjs','utf8');
 m=m.replace('export const exercises = ["lateral-raise","front-raise"];','export const exercises = '+JSON.stringify([id])+';');
 const start=m.indexOf('    const upperDirection='),end=m.indexOf("    byName['clavicle.",start);assert.ok(start>0&&end>start);
 m=m.slice(0,start)+`    const theta=rad(12+68*lift),plane=rad(30);
    const upperDirection=new THREE.Vector3(sign*Math.cos(plane)*Math.sin(theta),-Math.cos(theta),Math.sin(plane)*Math.sin(theta));
    const lowerDirection=upperDirection.clone().add(new THREE.Vector3(0,0,.12)).normalize();
`+m.slice(end);
 m=m.replace("const desiredAcross=id==='front-raise'?new THREE.Vector3(-sign,0,0):new THREE.Vector3(0,0,1);",`const desiredAcross=new THREE.Vector3(0,${id==='full-can-raise'?1:-1},0);`);
 s=s.replace('window.renderSkinned(0);window.ready=true;',`window.inspectGeometry=frame=>{pose(frame);let floorClearance=Infinity,clothFloorClearance=Infinity;for(let i=0;i<geometry.attributes.position.count;i++)floorClearance=Math.min(floorClearance,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).y+7.9);for(let i=0;i<clothGeometry.attributes.position.count;i++)clothFloorClearance=Math.min(clothFloorClearance,shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i)).y+7.9);return {floorClearance,clothFloorClearance};};window.renderSkinned(0);window.ready=true;`);
 fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);
 entry.status='motion-preview';entry.recipe={family:'scaption',sourceUrls:['https://pmc.ncbi.nlm.nih.gov/articles/PMC4732390/'],criteria:'Bilateral dumbbell elevation in plane 30 degrees anterior to frontal plane; '+(id==='full-can-raise'?'thumbs up':'thumbs down')+'; fixed feet and trunk, shoulder-height range.',sourcesCheckedAt:'2026-11-13'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');
