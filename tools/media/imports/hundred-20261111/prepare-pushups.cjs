const fs=require('node:fs');
const base='tools/media/imports/hundred-20261111';
const ids=['decline-push-up','close-grip-push-up','wide-push-up'];
const batch=JSON.parse(fs.readFileSync(base+'/batch.json','utf8'));
const studio=fs.readFileSync(base+'/double-kettlebell-press-studio.mjs','utf8').split('const rubber=new THREE.MeshStandardMaterial')[0];
const motion=String.raw`import * as THREE from './three.module.js';
export const exercises=['decline-push-up','close-grip-push-up','wide-push-up'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};
let toeIndices;
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 const decline=id==='decline-push-up',wide=id==='wide-push-up',width=wide?3.4:decline?2.5:1.5;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 const angle=rad((decline?83:68)+(decline?15:16)*lift);
 byName.root.position.set(0,0,0);byName.root.quaternion.setFromAxisAngle(v([1,0,0]),angle);
 for(const s of ['L','R']){
  const leg=v([0,-Math.cos(angle),-Math.sin(angle)]);
  aim('upperleg01.'+s,rest('upperleg01.'+s,'lowerleg01.'+s),leg);
  aim('lowerleg01.'+s,rest('lowerleg01.'+s,'foot.'+s),leg);
  mesh.updateMatrixWorld(true);byName['foot.'+s].quaternion.copy(byName['foot.'+s].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([1,0,0]),rad(60))));
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();
 if(!toeIndices){toeIndices=[];const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;for(let i=0;i<si.count;i++){const ix=[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)],w=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)],n=mesh.skeleton.bones[ix[w.indexOf(Math.max(...w))]].name;if(/^toe/.test(n))toeIndices.push(i);}}
 const toeY=Math.min(...toeIndices.map(i=>mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)).y));
 byName.root.position.y+=-7.9+(decline?3:0)-toeY;
 byName.root.position.z+=-8-pos('foot.L').z;
 const grips=[];
 for(const s of ['L','R']){
  const sign=s==='L'?1:-1,a='upperarm01.'+s,b='lowerarm01.'+s,c='wrist.'+s;
  const target=v([sign*width,-7.53,4.6]),start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),distance=axis.length();
  if(distance>=u.length()+l.length()||distance<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+id+' '+s+' '+distance);
  axis.normalize();const along=(u.lengthSq()-l.lengthSq()+distance**2)/(2*distance),pole=v([sign*(wide?.9:.35),0,-1]);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,u.lengthSq()-along**2)));
  aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));
  const index=v(dataByName['finger2-1.'+s].head),little=v(dataByName['finger5-1.'+s].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[c].head));
  const forward=v([0,0,1]),across=v([-sign,0,0]),world=q().setFromRotationMatrix(basis(forward,across).multiply(basis(palm,index.clone().sub(little)).invert()));
  mesh.updateMatrixWorld(true);byName[c].quaternion.copy(byName[c].parent.getWorldQuaternion(q()).invert().multiply(world));
  for(let f=1;f<=5;f++)for(let j=1;j<=3;j++){const name='finger'+f+'-'+j+'.'+s;mesh.updateMatrixWorld(true);const current=byName[name].getWorldQuaternion(q()),old=v(dataByName[name].tail).sub(v(dataByName[name].head)).normalize().applyQuaternion(current),d=forward.clone().addScaledVector(across,f===1?.7:0).normalize();byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(old,d).multiply(current)));}
  grips.push({side:s,socket:v([0,0,0]),grip:target});
 }
 return grips;
}
`;
const tail=String.raw`
const decline=exercise==='decline-push-up';
if(decline){const rubber=new THREE.MeshStandardMaterial({color:'#263b45',roughness:.8}),metal=new THREE.MeshStandardMaterial({color:'#91a2ac',metalness:.5,roughness:.4});function box(size,p,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...p);scene.add(o);}box([5,.5,3.6],[0,-5.15,-7.5],rubber);for(const x of [-1.8,1.8])box([.3,2.4,2.6],[x,-6.6,-7.5],metal);}
const restPositions=bones.map(b=>b.position.clone());let grips=[];
const smooth=t=>t*t*t*(t*(t*6-15)+10);
function pose(frame){const t=((frame%480)+480)%480/480,lift=t<.4375?smooth(t/.4375):t<.5625?1:1-smooth((t-.5625)/.4375);for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}grips=applyMotion(exercise,lift,{byName,dataByName,mesh});mesh.updateMatrixWorld(true);skeleton.update();}
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=1.02;camera.position.set(view==='side'?32:24,view==='side'?-2:6,view==='side'?0:22);camera.lookAt(0,-4,-.5);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1','upperarm01','lowerarm01','wrist'])j[n+'.'+side]=byName[n+'.'+side].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();j.grips=grips.map(g=>byName['wrist.'+g.side].getWorldPosition(new THREE.Vector3()).toArray());j.targets=grips.map(g=>g.grip.toArray());return j;};
window.inspectGeometry=frame=>{pose(frame);const minimum={body:Infinity,hands:Infinity,toes:Infinity,cloth:Infinity};for(let i=0;i<geometry.attributes.position.count;i++){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));let k=0;for(let a=1;a<4;a++)if(model.skinWeights[i*4+a]>model.skinWeights[i*4+k])k=a;const name=model.bones[model.skinIndices[i*4+k]].name;minimum.body=Math.min(minimum.body,p.y);if(/^(wrist|finger)/.test(name))minimum.hands=Math.min(minimum.hands,p.y);if(/^toe/.test(name))minimum.toes=Math.min(minimum.toes,p.y);}for(let i=0;i<clothGeometry.attributes.position.count;i++)minimum.cloth=Math.min(minimum.cloth,shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i)).y);return {...minimum,gripError:Math.max(...grips.map(g=>byName['wrist.'+g.side].getWorldPosition(new THREE.Vector3()).distanceTo(g.grip))),floorClearance:minimum.body+7.9,toeSupportGap:minimum.toes+7.9-(decline?3:0),handSupportGap:minimum.hands+7.9};};
window.renderSkinned(0);window.ready=true;
`;
for(const id of ids){const e=batch.entries.find(e=>e.id===id);if(e.status!=='awaiting-motion-implementation')continue;fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio+tail);e.status='ready-for-preview';e.recipe={family:'push-up',sourceUrls:['https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/',id==='decline-push-up'?'https://theprehabguys.com/vimeo-video/decline-push-up/':'https://www.puregym.com/exercises/chest/press-up/wide-grip-push-ups/'],criteria:'Rigid trunk and straight legs; fixed palms and toes; controlled descent and return. '+(id==='decline-push-up'?'Feet supported on elevated bench.':id==='wide-push-up'?'Hands wider than shoulders.':'Hands inside shoulder width; elbows track backward.')};}
batch.updatedAt=new Date().toISOString();fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');
