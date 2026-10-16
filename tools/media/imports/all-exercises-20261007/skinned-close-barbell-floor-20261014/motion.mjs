import * as THREE from './three.module.js';
export const floorPose={poleX:0.1822009537225757,half:2.45,bottomY:1.0783828130375515,bottomZ:-3.1521785473417214,topY:4.429810144787188,neck:16.980227606538392,leg:0.7304800358062858,arm:-0.3481145825380736};
export const exercises = ['close-grip-floor-press'];
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
  byName.root.position.y-=3.6; byName.root.rotation.x=-rad(90); byName["neck01"].rotation.x=-rad(floorPose.neck);
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
    aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.1,.70,.714));
    aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-floorPose.leg,.70));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    byName['clavicle.'+side].rotation.z=sign*rad(6);
    byName['shoulder01.'+side].rotation.z=sign*rad(16);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize(),across=index.clone().sub(little).normalize();
    const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(new THREE.Vector3(0,1,0),new THREE.Vector3(-sign,0,0)).multiply(orientation(palm,across).invert()));
    const forward=v(dataByName['finger3-1.'+side].tail).sub(v(dataByName['finger3-1.'+side].head)).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign),socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(wrist.head));
    const grip=new THREE.Vector3(sign*floorPose.half,floorPose.bottomY+(floorPose.topY-floorPose.bottomY)*lift,floorPose.bottomZ+(-5.725841085176839-floorPose.bottomZ)*lift),w=grip.sub(socket.applyQuaternion(targetWorld));
    mesh.updateMatrixWorld(true);const sh=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),axis=w.clone().sub(sh),distance=axis.length(),lenA=v(elbow.head).distanceTo(v(upper.head)),lenB=v(wrist.head).distanceTo(v(elbow.head));
    if(distance>lenA+lenB)throw Error('Unreachable arm '+distance);
    axis.normalize();const along=(lenA*lenA-lenB*lenB+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,lenA*lenA-along*along)),pole=new THREE.Vector3(sign*floorPose.poleX,-1,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const ep=sh.clone().addScaledVector(axis,along).addScaledVector(pole,height),upperDirection=ep.clone().sub(sh).normalize(),lowerDirection=w.clone().sub(ep).normalize();
    aim('upperarm01.'+side,upperRest,upperDirection);
    const q=byName['upperarm01.'+side].getWorldQuaternion(new THREE.Quaternion()),currentBend=lowerRest.clone().applyQuaternion(q);currentBend.addScaledVector(upperDirection,-currentBend.dot(upperDirection)).normalize();const wantedBend=lowerDirection.clone().addScaledVector(upperDirection,-lowerDirection.dot(upperDirection)).normalize();const bendTwist=Math.atan2(new THREE.Vector3().crossVectors(currentBend,wantedBend).dot(upperDirection),currentBend.dot(wantedBend));byName['upperarm01.'+side].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(upperRest,bendTwist));mesh.updateMatrixWorld(true);const uq=byName['upperarm01.'+side].getWorldQuaternion(new THREE.Quaternion()),lr=lowerRest.clone().applyQuaternion(uq),lq=new THREE.Quaternion().setFromUnitVectors(lr,lowerDirection).multiply(uq);byName['lowerarm01.'+side].quaternion.copy(byName['lowerarm01.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(lq));mesh.updateMatrixWorld(true);
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

