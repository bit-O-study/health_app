const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',id='smith-machine-bent-over-row',b=JSON.parse(fs.readFileSync(base+'/batch.json')),e=b.entries.find(x=>x.id===id);assert.equal(e.status,'awaiting-motion-implementation');
let m=fs.readFileSync(base+'/kettlebell-sumo-squat-motion.mjs','utf8'),s=fs.readFileSync(base+'/thruster-studio.mjs','utf8');
m=m.replace("['kettlebell-sumo-squat']",JSON.stringify([id]));
m=m.replace('byName.root.position.y+=.2-4.35*phase;byName.root.position.z-=1.3*phase;byName.root.quaternion.setFromAxisAngle(v([1,0,0]),rad(15*phase));','byName.root.position.y-=.3;byName.root.position.z-=.7;byName.spine05.rotation.x=rad(40);');
m=m.replace('sign*2.6','sign*1.8').replace('sign*22','sign*10');
const start=m.indexOf('  const offset='),end=m.indexOf('  for(let f=2;',start);
m=m.slice(0,start)+`  const offset=socket.clone().applyQuaternion(world),grip=v([sign*2.6,-1.2+2.8*phase,3.4]);
  ik(upper,elbow,wrist,grip.clone().sub(offset),v([sign*.2,1,-.5]));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
`+m.slice(end);
s=s.replace('plateCenters=[];\n const center=',`plateCenters=[];
 for(const sign of [-1,1]){rod(new THREE.Vector3(sign*6.7,-7.9,3.4),new THREE.Vector3(sign*6.7,8,3.4),.16);rod(new THREE.Vector3(sign*6.7,-7.72,-1),new THREE.Vector3(sign*6.7,-7.72,6),.18);}
 const center=`);
fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);e.status='motion-preview';e.recipe={family:'smith-row',sourceUrls:['https://www.muscleandstrength.com/exercises/smith-machine-bent-over-row.html'],criteria:'Fixed hinged torso and feet; overhand row with a vertical bar path on two rails.',sourcesCheckedAt:'2026-11-13'};fs.writeFileSync(base+'/batch.json',JSON.stringify(b,null,2)+'\n');
