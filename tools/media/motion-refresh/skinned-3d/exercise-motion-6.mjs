import * as THREE from './three.module.js';
export const exercises=['barbell-shrug','barbell-front-raise','barbell-upright-row','wide-grip-upright-row'];
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
  const sign=side==='L'?1:-1,shrug=id==='barbell-shrug',front=id==='barbell-front-raise',wide=id==='wide-grip-upright-row';
  const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
  const upperRest=v(elbow.head).sub(v(upper.head)),lowerRest=v(wrist.head).sub(v(elbow.head));
  const upperLength=upperRest.length(),lowerLength=lowerRest.length();
  byName['clavicle.'+side].rotation.z=sign*rad((shrug?10:front?2:4)*lift);
  if(shrug)byName['shoulder01.'+side].position.y+=.15*lift;
  if(front)byName['shoulder01.'+side].rotation.x=-rad(5*lift);
  mesh.updateMatrixWorld(true);
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3());
  let upperDirection,lowerDirection;
  if(!shrug&&!front){
   // Two-bone solution preserves the wrist's horizontal location and limb
   // lengths while the elbow leads outward along a continuous plane.
   const target=new THREE.Vector3(sign*(wide?3.2:2.2),1.0+3.65*lift+(wide?.3*(1-lift):0),1.9);
   const delta=target.clone().sub(shoulder),distance=delta.length(),axis=delta.normalize();
   if(distance>=upperLength+lowerLength)throw Error('Unreachable upright row');
   const along=(upperLength**2-lowerLength**2+distance**2)/(2*distance);
   const pole=new THREE.Vector3(sign,0,-.12);
   pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const elbowTarget=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(upperLength**2-along**2));
   upperDirection=elbowTarget.clone().sub(shoulder).normalize();
   lowerDirection=target.sub(elbowTarget).normalize();
  }else{
   const angle=rad(front?14+72*lift:14);
   upperDirection=new THREE.Vector3(sign*.035,-Math.cos(angle),Math.sin(angle)).normalize();
   // Compensate small shoulder-girdle motion so grip spacing stays fixed.
   const lowerX=(sign*2.18-shoulder.x-upperLength*upperDirection.x)/lowerLength;
   const yz=Math.sqrt(1-lowerX*lowerX),lowerAngle=angle+rad(8);
   lowerDirection=new THREE.Vector3(lowerX,-yz*Math.cos(lowerAngle),yz*Math.sin(lowerAngle));
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
