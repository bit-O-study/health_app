import * as THREE from './three.module.js';
export const exercises = ['barbell-overhead-press'];
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

  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    byName['clavicle.'+side].rotation.z=sign*rad(6*lift);
    byName['shoulder01.'+side].rotation.z=sign*rad(20*lift);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize(),across=index.clone().sub(little).normalize();
    const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(new THREE.Vector3(0,1,0),new THREE.Vector3(-sign,0,0)).multiply(orientation(palm,across).invert()));
    const forward=v(dataByName['finger3-1.'+side].tail).sub(v(dataByName['finger3-1.'+side].head)).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign),socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(wrist.head));
    const retract=Math.max(0,(lift-.72)/.28),barZ=2.15-1.35*retract*retract*(3-2*retract),grip=new THREE.Vector3(sign*3.7,6.45+5.85*lift,barZ),w=grip.sub(socket.applyQuaternion(targetWorld));
    mesh.updateMatrixWorld(true);const sh=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),axis=w.clone().sub(sh),distance=axis.length(),lenA=v(elbow.head).distanceTo(v(upper.head)),lenB=v(wrist.head).distanceTo(v(elbow.head));
    if(distance>lenA+lenB)throw Error('Unreachable arm '+distance);
    axis.normalize();const along=(lenA*lenA-lenB*lenB+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,lenA*lenA-along*along)),pole=new THREE.Vector3(sign*.6,-.7,.8);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const ep=sh.clone().addScaledVector(axis,along).addScaledVector(pole,height),upperDirection=ep.clone().sub(sh).normalize(),lowerDirection=w.clone().sub(ep).normalize();
    aim('upperarm01.'+side,upperRest,upperDirection);aim('lowerarm01.'+side,lowerRest,lowerDirection);
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

