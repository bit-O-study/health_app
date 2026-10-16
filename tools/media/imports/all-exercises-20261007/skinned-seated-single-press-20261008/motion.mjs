import * as THREE from './three.module.js';
export const exercises = ['seated-single-arm-dumbbell-shoulder-press'];
const v = a => new THREE.Vector3().fromArray(a);
const rad = THREE.MathUtils.degToRad;
const xAxis = new THREE.Vector3(1,0,0);
function orientation(forward, across) {
  const x = forward.clone().normalize();
  const y = across.clone().addScaledVector(x,-across.dot(x)).normalize();
  return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));
}
export function applyMotion(id, lift, {byName,dataByName,mesh}) {
  if(!exercises.includes(id))throw new Error('Unknown exercise: '+id);
  const aim = (name, rest, direction) => {
    const bone=byName[name]; mesh.updateMatrixWorld(true);
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest.clone().normalize(),direction.clone().normalize())));
    mesh.updateMatrixWorld(true);
  };
  byName.root.position.y-=3.6;
  for(const side of ['L','R']){
    const active=side==='L';const armLift=active?lift:0;
    const sign=side==='L'?1:-1;
    const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
    aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));
    aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    const upperDirection=new THREE.Vector3(sign*.94,-.34,.08).lerp(new THREE.Vector3(sign*.17,.982,.08),armLift).normalize();
    const lowerDirection=new THREE.Vector3(-sign*.08,.995,.03).lerp(new THREE.Vector3(-sign*.13,.991,.03),armLift).normalize();
    if(!active){mesh.updateMatrixWorld(true);const s=byName['upperarm01.R'].getWorldPosition(new THREE.Vector3()),w=new THREE.Vector3(-2.5,-2.75,.4),axis=w.clone().sub(s),distance=axis.length(),a=v(elbow.head).distanceTo(v(upper.head)),b=v(wrist.head).distanceTo(v(elbow.head));axis.normalize();const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along)),pole=new THREE.Vector3(-1,0,-.2);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const e=s.clone().addScaledVector(axis,along).addScaledVector(pole,height);upperDirection.copy(e).sub(s).normalize();lowerDirection.copy(w).sub(e).normalize();}
    byName['clavicle.'+side].rotation.z=sign*rad(6*armLift);
    byName['shoulder01.'+side].rotation.z=sign*rad(20*armLift);
    aim('upperarm01.'+side,upperRest,upperDirection);
    aim('lowerarm01.'+side,lowerRest,lowerDirection);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();
    const desiredAcross=active?new THREE.Vector3(-sign,0,0):new THREE.Vector3(1,0,0);const handForward=active?lowerDirection:new THREE.Vector3(0,0,1);
    const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(handForward,desiredAcross).multiply(orientation(palm,across).invert()));
    mesh.updateMatrixWorld(true);
    const currentAcross=across.clone().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion()));
    const wantedAcross=across.clone().applyQuaternion(targetWorld);
    const current=currentAcross.addScaledVector(lowerDirection,-currentAcross.dot(lowerDirection)).normalize();
    const wanted=wantedAcross.addScaledVector(lowerDirection,-wantedAcross.dot(lowerDirection)).normalize();
    const twist=Math.atan2(new THREE.Vector3().crossVectors(current,wanted).dot(lowerDirection),current.dot(wanted));
    byName['lowerarm02.'+side].quaternion.setFromAxisAngle(lowerRest,twist*.55);
    mesh.updateMatrixWorld(true);
    const parentWorld=byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion());
    byName['wrist.'+side].quaternion.copy(parentWorld.invert().multiply(targetWorld));
  }
}

