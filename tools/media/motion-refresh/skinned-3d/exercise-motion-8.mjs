import * as THREE from './three.module.js';
export const exercises=["barbell-overhead-press","drag-curl","behind-the-back-shrug"];
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
  const sign=side==='L'?1:-1,press=id==='barbell-overhead-press',shrug=id==='behind-the-back-shrug',drag=id==='drag-curl';
  const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
  const upperRest=v(elbow.head).sub(v(upper.head)),lowerRest=v(wrist.head).sub(v(elbow.head));
  const upperLength=upperRest.length(),lowerLength=lowerRest.length();
  byName['clavicle.'+side].rotation.z=sign*rad((shrug?10:press?6:0)*lift);
  if(shrug)byName['shoulder01.'+side].position.y+=.15*lift;
  if(press)byName['shoulder01.'+side].rotation.z=sign*rad(18*lift);
  mesh.updateMatrixWorld(true);
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3());
  let upperDirection,lowerDirection;
  if(shrug){
   upperDirection=new THREE.Vector3(sign*.035,-Math.cos(rad(18)),-Math.sin(rad(18))).normalize();
   const x=(sign*2.25-shoulder.x-upperLength*upperDirection.x)/lowerLength;
   const yz=Math.sqrt(1-x*x);
   lowerDirection=new THREE.Vector3(x,-yz*Math.cos(rad(22)),-yz*Math.sin(rad(22)));
  }else{
   const smooth=x=>x*x*x*(x*(x*6-15)+10);
   const back=smooth(Math.max(0,(lift-.5)/.5));
   const target=press?new THREE.Vector3(sign*2.8,6.1+5.2*lift,2.45-2.0*back):new THREE.Vector3(sign*2.25,1.0+3.3*lift,.85);
   const delta=target.clone().sub(shoulder),distance=delta.length(),axis=delta.normalize();
   if(distance>=upperLength+lowerLength)throw Error('Unreachable arm target');
   const along=(upperLength**2-lowerLength**2+distance**2)/(2*distance);
   const pole=press?new THREE.Vector3(sign*.3,-1,1).lerp(new THREE.Vector3(sign,0,.15),lift):new THREE.Vector3(sign*.1,0,-1);
   pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const elbowTarget=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(upperLength**2-along**2));
   upperDirection=elbowTarget.clone().sub(shoulder).normalize();
   lowerDirection=target.sub(elbowTarget).normalize();
  }
  aim('upperarm01.'+side,upperRest,upperDirection);
  aim('lowerarm01.'+side,lowerRest,lowerDirection);
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
  const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize(),across=index.sub(little).normalize();
  const desiredAcross=new THREE.Vector3((drag||shrug?1:-1)*sign,0,0);
  const oblique=palm.dot(across);
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
