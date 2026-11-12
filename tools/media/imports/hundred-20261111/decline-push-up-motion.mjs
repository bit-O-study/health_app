import * as THREE from './three.module.js';
export const exercises=['decline-push-up','close-grip-push-up','wide-push-up'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};
let toeIndices;
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 const decline=id==='decline-push-up',wide=id==='wide-push-up',width=wide?3.4:decline?2.5:1.5;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 const angle=rad((decline?87.6:wide?75.35:74.45)+(decline?6.9:wide?7.65:7.05)*lift);
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
  const target=v([sign*width,-7.59,4.6]),start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),distance=axis.length();
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
