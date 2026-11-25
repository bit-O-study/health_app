import * as THREE from './three.module.js';
export const exercises=['front-lever','back-lever'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 const back=id==='back-lever',direction=back?-1:1;byName.root.quaternion.setFromAxisAngle(v([1,0,0]),-direction*Math.PI/2);byName.root.position.set(0,0,0);
 for(const side of ['L','R']){const d=v([0,0,direction]),legAim=(bone,r)=>{const basis=(a,n)=>{const x=a.clone().normalize(),y=n.clone().addScaledVector(x,-n.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};mesh.updateMatrixWorld(true);byName[bone].quaternion.copy(byName[bone].parent.getWorldQuaternion(q()).invert().multiply(q().setFromRotationMatrix(basis(d,v([0,direction,0])).multiply(basis(r,v([0,0,1])).invert()))));};legAim('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side));legAim('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([1,0,0]),back?Math.PI:0)));}
 const grips=[];
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));
  const direction=v([0,1,0]);
  const world=q().setFromRotationMatrix(orientation(direction,v([-sign,0,0])).multiply(orientation(palm,across).invert()));
  const arm=v([0,.85,(back?-1:1)*.53]);aim(upper,rest(upper,elbow),arm);aim(elbow,rest(elbow,wrist),arm);const grip=pos(wrist).add(socket.clone().applyQuaternion(world));
  mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
  for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));
  const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());
  for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));
  grips.push({side,socket,grip});
 }
 window.leverGrips=grips.map(g=>g.grip);return grips;
}

