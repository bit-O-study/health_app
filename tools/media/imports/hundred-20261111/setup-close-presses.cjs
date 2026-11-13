const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',src='tools/media/imports/all-exercises-20261007/skinned-flat-neutral-press-20261008';
const b=JSON.parse(fs.readFileSync(base+'/batch.json'));
for(const id of ['squeeze-press','tate-press']){
 const e=b.entries.find(e=>e.id===id);assert.equal(e.status,'awaiting-motion-implementation');
 let m=fs.readFileSync(id==='squeeze-press'?'tools/media/imports/popular-three-b14-20261109/smith-bench-press-motion.mjs':src+'/motion.mjs','utf8'),s=fs.readFileSync(src+'/studio.mjs','utf8');
 m=m.replace(/export const exercises = .*?;/,'export const exercises = '+JSON.stringify([id])+';');
 if(id==='squeeze-press'){
  m=m.replace(/export const fit=.*?;/,'export const fit={half:.61,bottomY:.3,topY:3.0,bottomZ:-4.4,pole:.15,angle:0};');
  m=m.replace('new THREE.Vector3(-sign,0,0)).multiply(orientation(palm,across)', 'new THREE.Vector3(0,0,-1)).multiply(orientation(palm,across)');
 }else{
  const start=m.indexOf('    const upperDirection='),end=m.indexOf("    aim('upperarm01.",start);
  m=m.slice(0,start)+`    const upperDirection=new THREE.Vector3(sign*.65,.76,.10).normalize().lerp(new THREE.Vector3(sign*.08,.996,.03),lift).normalize();
    const lowerDirection=new THREE.Vector3(-sign*.95,.31,.02).normalize().lerp(new THREE.Vector3(-sign*.06,.998,.02),lift).normalize();
    byName['clavicle.'+side].rotation.z=sign*rad(6);byName['shoulder01.'+side].rotation.z=sign*rad(16);
`+m.slice(end);
  m=m.replace('const desiredAcross=new THREE.Vector3(0,lowerDirection.z,-lowerDirection.y).normalize();','const desiredAcross=new THREE.Vector3(sign*lowerDirection.y,-sign*lowerDirection.x,0).normalize();');
 }
 s=s.replace('floor.receiveShadow = true;','floor.visible=false;floor.receiveShadow = true;').replace('scene.add(contactShadow);','contactShadow.visible=false;scene.add(contactShadow);');
 const insp=fs.readFileSync(base+'/full-can-raise-studio.mjs','utf8');s+='\n'+insp.slice(insp.indexOf('window.inspectRunning='),insp.indexOf('window.inspectGeometry='));
 s+=`window.inspectGeometry=frame=>{const p=window.inspectPose(frame);return {floorClearance:p.soleMinY+7.751375,backGap:p.backSignedGap,headSupportError:p.headSupportError,equipmentBodyClearance:p.equipmentBodyClearance,equipmentPadClearance:p.equipmentBackPadClearance,equipmentHeadPadClearance:p.equipmentHeadPadClearance,equipmentBenchClearance:p.equipmentBenchClearance};};window.renderSkinned(0);window.ready=true;`;
 fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);
 e.status='motion-preview';e.recipe={family:'close-dumbbell-press',sourceUrls:[id==='squeeze-press'?'https://www.muscleandstrength.com/node/4096':'https://www.strengthlog.com/tate-press/'],criteria:id==='squeeze-press'?'Neutral dumbbells together through vertical press, tucked elbows and bench support.':'Elbows flare outward as dumbbells fold toward chest, then extend elbows; supported head and back.',sourcesCheckedAt:'2026-11-13'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(b,null,2)+'\n');
