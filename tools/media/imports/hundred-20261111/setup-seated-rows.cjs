const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',batch=JSON.parse(fs.readFileSync(base+'/batch.json'));
const ids=['wide-grip-cable-row','single-arm-cable-row','band-row'];
for(const id of ids){
const e=batch.entries.find(x=>x.id===id);assert.equal(e.status,'awaiting-motion-implementation');
const config={family:'row',anchor:[0,1,12],equipment:id==='band-row'?'band':'cable',single:id.startsWith('single-arm'),wide:id.startsWith('wide')};
let m=fs.readFileSync(base+'/standing-band-row-motion.mjs','utf8'),s=fs.readFileSync(base+'/standing-cable-chest-press-studio.mjs','utf8');
m=m.replace(/export const exercises=.*?;/,'export const exercises='+JSON.stringify([id])+';').replace(/const config=\{.*?\},v=/,'const config='+JSON.stringify(config)+',v=');
m=m.replace('byName.root.position.y+=.32','byName.root.position.y-=3');
m=m.replace("for(const side of ['L','R']){const sign=side==='L'?1:-1,upper=", "for(const side of ['L','R']){const sign=side==='L'?1:-1;const hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side;aim(hip,rest(hip,knee),v([sign*.05,0,1]));aim(knee,rest(knee,foot),v([0,-Math.SQRT1_2,Math.SQRT1_2]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([1,0,0]),rad(-45))));const upper=");
m=m.replace("a=v([sign*(.08+.35*f),-.85*f,1-1.35*f]);b=v([0,.05,1]);", "a=config.wide?v([sign*(.35+.65*f),-.25,1-1.3*f]):v([sign*(.08+.35*f),-.85*f,1-1.35*f]);b=v([0,.05,1]);");
m=m.replace("if(!active){a=v([sign*.2,-1,0]);b=v([sign*.15,-1,.1]);}","if(!active){a=v([sign*.12,-1,.25]);b=v([0,-.25,1]);}");
s=s.replace(/const config=\{.*?\},anchor=/,'const config='+JSON.stringify(config)+',anchor=');
s=s.replace('const restPositions=bones.map',`const seat=box(4,.65,3.3,new THREE.Vector3(0,-3.1,0));for(const x of [-1.5,1.5]){rod(new THREE.Vector3(x,-7.9,0),new THREE.Vector3(x,-3.4,0),.2);box(1,.2,4,new THREE.Vector3(x,-7.8,0));}
const footplates=[];for(const x of [-1.3,1.3]){const p=box(2.4,.3,3,new THREE.Vector3(x,-5.2,8));p.rotation.x=-Math.PI/4;footplates.push(p);rod(new THREE.Vector3(x,-7.9,9),new THREE.Vector3(x,-5.2,8),.15);}
const restPositions=bones.map`);
s=s.replace("camera.zoom=config.equipment==='cable'?.65:config.anchor[1]>10?.7:.8","camera.zoom=config.equipment==='cable'?.62:.8");
s=s.replace("camera.lookAt(config.family==='lateral'?-1.5:0,config.equipment==='cable'||config.anchor[1]>10?2:.3,config.anchor[2]/3)","camera.lookAt(0,config.equipment==='cable'?1:-1,5)");
s=s.replace('window.renderSkinned(0);window.ready=true;',`window.renderSkinned(0);let seatBottom=Infinity;for(let i=0;i<model.vertices.length/3;i++){const r=vec(model.vertices.slice(i*3,i*3+3));if(Math.abs(r.x)<1.4&&r.y>-.8&&r.y<1.5&&r.z<0)seatBottom=Math.min(seatBottom,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).y);}seat.position.y=seatBottom-.325-.02;window.renderSkinned(0);window.ready=true;`);
fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);e.status='motion-preview';e.recipe={family:'seated-row',sourceUrls:['https://www.acefitness.org/resources/everyone/exercise-library/48/seated-row/'],criteria:'Seated upright row with stable seat and footplates; '+(config.single?'left arm only':config.wide?'wide handles and wider elbows':'bilateral band anchored ahead'),sourcesCheckedAt:'2026-11-13'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');fs.writeFileSync(base+'/seated-rows-ids.json',JSON.stringify(ids,null,2)+'\n');
