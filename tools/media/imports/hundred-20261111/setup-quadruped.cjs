const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',batch=JSON.parse(fs.readFileSync(base+'/batch.json')),ids=['donkey-kick','fire-hydrant','cat-cow'];
for(const id of ids){const e=batch.entries.find(x=>x.id===id);assert.equal(e.status,'awaiting-motion-implementation');let m=fs.readFileSync('tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/motion.mjs','utf8'),s=fs.readFileSync(base+'/jump-squat-studio.mjs','utf8');
m=m.replace("['quadruped-hip-extension']",JSON.stringify([id]));
if(id==='donkey-kick')m=m.replace('new THREE.Vector3(0,working?.25*(1-a):.25,-1)','working?new THREE.Vector3(0,Math.sin(th),-Math.cos(th)):new THREE.Vector3(0,.25,-1)');
if(id==='fire-hydrant'){m=m.replace('theta=rad(90*a)','theta=rad(55*a)').replace('new THREE.Vector3(0,-Math.cos(th),-Math.sin(th))','new THREE.Vector3(working?-Math.sin(th):0,-Math.cos(th),0)').replace('new THREE.Vector3(0,working?.25*(1-a):.25,-1)','new THREE.Vector3(0,.25,-1)');}
if(id==='cat-cow'){
m=m.replace("const working=side==='R'","const working=false");
m=m.replace("for(const side of ['L','R']){const working=",`const handTargets={};for(const side of ['L','R']){mesh.updateMatrixWorld(true);const p=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3());handTargets[side]=new THREE.Vector3(p.x,-7.411375,p.z+.3);}for(const n of ['spine05','spine04','spine03','spine02','spine01'])byName[n].rotation.x=rad(5*(2*a-1));byName['neck01'].rotation.x=rad(8*(2*a-1));
for(const side of ['L','R']){const working=`);
m=m.replace('target=new THREE.Vector3(shoulder.x,-7.411375,shoulder.z+.3)','target=handTargets[side].clone()');
}
s=s.replace('camera.zoom=.88','camera.zoom=1.05').replace("camera.position.set(view==='side'?32:14,3,view==='side'?0:30);camera.lookAt(0,1,0)","camera.position.set(view==='side'?32:20,5,view==='side'?0:25);camera.lookAt(0,-4,1)");
fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);e.status='motion-preview';e.recipe={family:'quadruped',sourceUrls:['https://www.acefitness.org/resources/everyone/exercise-library/'],criteria:id==='cat-cow'?'Controlled spinal flexion and extension with fixed hands and knees':id==='donkey-kick'?'Bent-knee hip extension, pelvis level and palms fixed':'Bent-knee hip abduction, pelvis level and palms fixed',sourcesCheckedAt:'2026-11-13'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');fs.writeFileSync(base+'/quadruped-ids.json',JSON.stringify(ids,null,2)+'\n');
