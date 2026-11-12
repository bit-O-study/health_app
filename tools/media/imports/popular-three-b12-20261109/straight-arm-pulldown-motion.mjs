import * as THREE from './three.module.js';
export const exercises=['straight-arm-pulldown'];
const v=a=>new THREE.Vector3().fromArray(a);
const rad=THREE.MathUtils.degToRad;
function orientation(forward,across){
 const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();
 return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));
}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 if(!exercises.includes(id))throw Error('Unknown exercise: '+id);
 const aim=(name,rest,direction)=>{
  mesh.updateMatrixWorld(true);
  const parent=byName[name].parent.getWorldQuaternion(new THREE.Quaternion());
  byName[name].quaternion.copy(parent.invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest.clone().normalize(),direction.clone().normalize())));
  mesh.updateMatrixWorld(true);
 };
 byName.spine05.rotation.x=rad(15);
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,arnold=id==='arnold-press',close=true;
  const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
  const upperRest=v(elbow.head).sub(v(upper.head)),lowerRest=v(wrist.head).sub(v(elbow.head));
  const upperLength=upperRest.length(),lowerLength=lowerRest.length();
  byName['clavicle.'+side].rotation.z=sign*rad(0);
  if(arnold)byName['shoulder01.'+side].rotation.z=sign*rad(18*lift);
  mesh.updateMatrixWorld(true);
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3());
  const theta=rad(100-85*lift);
  const upperDirection=new THREE.Vector3(0,-Math.cos(theta),Math.sin(theta));
  const lowerDirection=new THREE.Vector3(0,-Math.cos(theta+rad(10)),Math.sin(theta+rad(10)));
  aim('upperarm01.'+side,upperRest,upperDirection);
  aim('lowerarm01.'+side,lowerRest,lowerDirection);
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
  const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize(),across=index.sub(little).normalize();
  const rotation=arnold?Math.PI*lift:0;
  const desiredAcross=arnold?new THREE.Vector3(sign*Math.cos(rotation),0,Math.sin(rotation)):new THREE.Vector3(-sign,0,0);
  const oblique=palm.dot(across);
  const desiredPalm=lowerDirection.clone().addScaledVector(desiredAcross,-lowerDirection.dot(desiredAcross)).normalize().multiplyScalar(Math.sqrt(1-oblique*oblique)).addScaledVector(desiredAcross,oblique);
  const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(desiredPalm,desiredAcross).multiply(orientation(palm,across).invert()));
  const currentAcross=across.clone().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion()));
  const wantedAcross=across.clone().applyQuaternion(targetWorld);
  const current=currentAcross.addScaledVector(lowerDirection,-currentAcross.dot(lowerDirection)).normalize();
  const wanted=wantedAcross.addScaledVector(lowerDirection,-wantedAcross.dot(lowerDirection)).normalize();
  let twist=Math.atan2(new THREE.Vector3().crossVectors(current,wanted).dot(lowerDirection),current.dot(wanted));
  // Arnold's continuous half turn crosses atan2's branch cut near the bottom.
  // Select the same winding for every frame, including reverse traversal.
  if(arnold&&twist<0)twist+=2*Math.PI;
  byName['lowerarm02.'+side].quaternion.setFromAxisAngle(lowerRest.clone().normalize(),twist*.55);
  mesh.updateMatrixWorld(true);
  byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(targetWorld));
 }
}
