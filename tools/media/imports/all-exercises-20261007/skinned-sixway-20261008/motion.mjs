import * as THREE from './three.module.js';
export const exercises = ['dumbbell-6-way-raise'];
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
    const times=[0,.4,1.5,2.6,3.8,4.2,5.4,6.5,7.6,8],indices=[0,0,1,2,3,3,2,1,0,0];let k=0;while(k<8&&lift>times[k+1])k++;const q=Math.max(0,Math.min(1,(lift-times[k])/(times[k+1]-times[k]))),w=(1-Math.cos(Math.PI*q))/2;const dirs=[new THREE.Vector3(sign*.21,-.985,0).normalize(),new THREE.Vector3(sign,0,0),new THREE.Vector3(-sign*.04,0,1).normalize(),new THREE.Vector3(sign*.04,.995,.1).normalize()],axes=[new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,1),new THREE.Vector3(-sign,0,0),new THREE.Vector3(-sign,0,0)];const upperDirection=dirs[indices[k]].clone().applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(dirs[indices[k]],dirs[indices[k+1]]),w)).normalize(),desiredAcross=axes[indices[k]].clone().lerp(axes[indices[k+1]],w).normalize();const lowerDirection=upperDirection.clone().applyAxisAngle(desiredAcross,sign*rad(8));const elevation=Math.max(0,(upperDirection.y+1)/2);byName['clavicle.'+side].rotation.z=sign*rad(6*elevation);byName['shoulder01.'+side].rotation.z=sign*rad(18*elevation);
    aim('upperarm01.'+side,upperRest,upperDirection);
    aim('lowerarm01.'+side,lowerRest,lowerDirection);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();

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

