import * as THREE from './three.module.js';
export const exercises = ['cable-fly'];
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
    const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    const theta=rad(85-85*lift),upperDirection=new THREE.Vector3(sign*Math.sin(theta),0,Math.cos(theta)),lowerDirection=new THREE.Vector3(sign*Math.sin(theta-rad(20)),0,Math.cos(theta-rad(20)));byName['clavicle.'+side].rotation.z=sign*rad(6);byName['shoulder01.'+side].rotation.z=sign*rad(16);
    aim('upperarm01.'+side,upperRest,upperDirection);
    const q=byName['upperarm01.'+side].getWorldQuaternion(new THREE.Quaternion()),currentBend=lowerRest.clone().applyQuaternion(q);currentBend.addScaledVector(upperDirection,-currentBend.dot(upperDirection)).normalize();const wantedBend=lowerDirection.clone().addScaledVector(upperDirection,-lowerDirection.dot(upperDirection)).normalize();const bendTwist=Math.atan2(new THREE.Vector3().crossVectors(currentBend,wantedBend).dot(upperDirection),currentBend.dot(wantedBend));byName['upperarm01.'+side].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(upperRest,bendTwist));mesh.updateMatrixWorld(true);const uq=byName['upperarm01.'+side].getWorldQuaternion(new THREE.Quaternion()),lr=lowerRest.clone().applyQuaternion(uq),lq=new THREE.Quaternion().setFromUnitVectors(lr,lowerDirection).multiply(uq);byName['lowerarm01.'+side].quaternion.copy(byName['lowerarm01.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(lq));mesh.updateMatrixWorld(true);

    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();
    // Curl is supinated, hammer/shrug neutral, front raise uses a pronated grip.
    const desiredAcross=new THREE.Vector3(0,1,0);
    const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(lowerDirection,desiredAcross).multiply(orientation(palm,across).invert()));
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

