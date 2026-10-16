import * as THREE from './three.module.js';
export const exercises=['single-arm-overhead-dumbbell-extension'];
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
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
  const upperRest=v(elbow.head).sub(v(upper.head)),lowerRest=v(wrist.head).sub(v(elbow.head));
  let upperDirection=new THREE.Vector3(sign*.17,-.985,0).normalize(),lowerDirection=upperDirection.clone();
  if(side==='L'){
   byName['clavicle.L'].rotation.z=rad(8);byName['shoulder01.L'].rotation.z=rad(18);
   upperDirection=new THREE.Vector3(.12,.993,0).normalize();
   const flex=rad(120-115*lift);lowerDirection=new THREE.Vector3(.12,Math.cos(flex),-Math.sin(flex)).normalize();
  }
  aim('upperarm01.'+side,upperRest,upperDirection);
  aim('lowerarm01.'+side,lowerRest,lowerDirection);
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
  const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize(),across=index.sub(little).normalize();
  const desiredAcross=new THREE.Vector3(-sign,0,0),oblique=palm.dot(across);
  const desiredPalm=lowerDirection.clone().addScaledVector(desiredAcross,-lowerDirection.dot(desiredAcross)).normalize().multiplyScalar(Math.sqrt(1-oblique*oblique)).addScaledVector(desiredAcross,oblique);
  const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(desiredPalm,desiredAcross).multiply(orientation(palm,across).invert()));
  const currentAcross=across.clone().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion()));
  const wantedAcross=across.clone().applyQuaternion(targetWorld);
  const current=currentAcross.addScaledVector(lowerDirection,-currentAcross.dot(lowerDirection)).normalize();
  const wanted=wantedAcross.addScaledVector(lowerDirection,-wantedAcross.dot(lowerDirection)).normalize();
  const twist=Math.atan2(new THREE.Vector3().crossVectors(current,wanted).dot(lowerDirection),current.dot(wanted));
  byName['lowerarm02.'+side].quaternion.setFromAxisAngle(lowerRest.clone().normalize(),twist*.55);
  mesh.updateMatrixWorld(true);
  byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(targetWorld));
 }
}
