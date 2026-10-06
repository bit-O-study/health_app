import * as THREE from './three.module.js';
export const exercises = ['dumbbell-biceps-curl','hammer-curl-2','dumbbell-front-raise','dumbbell-shrug'];
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
    let angle=8, upperDirection=new THREE.Vector3(sign*.17,-.985,0).normalize();
    if(id==='dumbbell-front-raise'){
      upperDirection.applyAxisAngle(xAxis,-rad(80*lift)); angle=80*lift+8;
      byName['clavicle.'+side].rotation.z=sign*rad(2*lift);
      byName['shoulder01.'+side].rotation.x=-rad(5*lift);
    }else if(id==='dumbbell-shrug'){
      byName['clavicle.'+side].rotation.z=sign*rad(10*lift);
      byName['shoulder01.'+side].position.y+=.15*lift;
    }else angle+=108*lift;
    const lowerDirection=new THREE.Vector3(sign*.17,-.985,0).normalize().applyAxisAngle(xAxis,-rad(angle));
    aim('upperarm01.'+side,upperRest,upperDirection);
    aim('lowerarm01.'+side,lowerRest,lowerDirection);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();
    // Curl is supinated, hammer/shrug neutral, front raise uses a pronated grip.
    const desiredAcross=id==='dumbbell-biceps-curl'?new THREE.Vector3(sign,0,0):id==='dumbbell-front-raise'?new THREE.Vector3(-sign,0,0):new THREE.Vector3(0,0,1).applyAxisAngle(xAxis,-rad(angle));
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
