import * as THREE from './three.module.js';
export const exercises = ['single-arm-dumbbell-lying-extension'];
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
  byName.root.position.y-=3.6; byName.spine05.rotation.x=-rad(90);
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
    aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));
    aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    const flex=rad(95-90*lift),upperDirection=new THREE.Vector3(sign*.12,.993,0).normalize();const lowerDirection=upperDirection.clone().applyAxisAngle(xAxis,-flex);byName['clavicle.'+side].rotation.z=sign*rad(6);byName['shoulder01.'+side].rotation.z=sign*rad(16);
    if(side==='R'){mesh.updateMatrixWorld(true);const sh=byName['upperarm01.R'].getWorldPosition(new THREE.Vector3()),w=new THREE.Vector3(1.45,-1.05,-4.97549),axis=w.clone().sub(sh),distance=axis.length(),a=v(elbow.head).distanceTo(v(upper.head)),b=v(wrist.head).distanceTo(v(elbow.head));axis.normalize();const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along)),pole=new THREE.Vector3(0,-.5,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const ep=sh.clone().addScaledVector(axis,along).addScaledVector(pole,height);upperDirection.copy(ep).sub(sh).normalize();lowerDirection.copy(w).sub(ep).normalize();}
    aim('upperarm01.'+side,upperRest,upperDirection);
    aim('lowerarm01.'+side,lowerRest,lowerDirection);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();
    // Curl is supinated, hammer/shrug neutral, front raise uses a pronated grip.
    const desiredAcross=side==='R'?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,lowerDirection.z,-lowerDirection.y).normalize();const handForward=side==='R'?new THREE.Vector3(0,1,0):lowerDirection;
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

