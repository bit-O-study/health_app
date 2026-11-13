import * as THREE from './three.module.js';
export const exercises = ["decline-dumbbell-fly"];
const v = a => new THREE.Vector3().fromArray(a);
const rad = THREE.MathUtils.degToRad;
const xAxis = new THREE.Vector3(1,0,0);
function orientation(forward, across) {
  const x = forward.clone().normalize();
  const y = across.clone().addScaledVector(x,-across.dot(x)).normalize();
  return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));
}
export function applyMotion(id, lift, {byName,dataByName,mesh},frame) {
 lift=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;const grips=[];
  if(!exercises.includes(id))throw new Error('Unknown exercise: '+id);
  const aim = (name, rest, direction) => {
    const bone=byName[name]; mesh.updateMatrixWorld(true);
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest.clone().normalize(),direction.clone().normalize())));
    mesh.updateMatrixWorld(true);
  };
  byName.root.position.y-=1.4; byName.spine05.rotation.x=-rad(120);
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
    aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));
    aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    const theta=rad(85-73*lift),upperDirection=new THREE.Vector3(sign*Math.sin(theta),Math.cos(theta),0).applyAxisAngle(xAxis,rad(0)),lowerDirection=new THREE.Vector3(sign*Math.sin(theta-rad(20)),Math.cos(theta-rad(20)),0).applyAxisAngle(xAxis,rad(0));byName['clavicle.'+side].rotation.z=sign*rad(6);byName['shoulder01.'+side].rotation.z=sign*rad(16);
    aim('upperarm01.'+side,upperRest,upperDirection);
    aim('lowerarm01.'+side,lowerRest,lowerDirection);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();
    // Curl is supinated, hammer/shrug neutral, front raise uses a pronated grip.
    const desiredAcross=new THREE.Vector3(0,lowerDirection.z,-lowerDirection.y).normalize();
    const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(lowerDirection,desiredAcross).multiply(orientation(palm,across).invert()));
    mesh.updateMatrixWorld(true);
    const currentAcross=across.clone().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion()));
    const wantedAcross=across.clone().applyQuaternion(targetWorld);
    const current=currentAcross.addScaledVector(lowerDirection,-currentAcross.dot(lowerDirection)).normalize();
    const wanted=wantedAcross.addScaledVector(lowerDirection,-wantedAcross.dot(lowerDirection)).normalize();
    const twist=Math.atan2(new THREE.Vector3().crossVectors(current,wanted).dot(lowerDirection),current.dot(wanted));
    byName['lowerarm02.'+side].quaternion.setFromAxisAngle(lowerRest,0);
    mesh.updateMatrixWorld(true);
    const parentWorld=byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion());
    byName['wrist.'+side].quaternion.copy(parentWorld.invert().multiply(targetWorld));
    const index0=v(dataByName['finger2-1.'+side].head),little0=v(dataByName['finger5-1.'+side].head),fw=v(dataByName['finger3-2.'+side].head).sub(v(dataByName['finger3-1.'+side].head)).normalize(),inward=new THREE.Vector3().crossVectors(across,fw).normalize().multiplyScalar(-sign),socket=index0.clone().add(little0).multiplyScalar(.5).addScaledVector(fw,.13).addScaledVector(inward,.18).sub(v(wrist.head));
    for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName['finger'+f+'-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));
    const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index0.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());for(let j=2;j<=3;j++)byName['finger1-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));
    mesh.updateMatrixWorld(true);grips.push({side,socket,grip:byName['wrist.'+side].localToWorld(socket.clone()),axis:across.clone().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion()))});

  }
 return grips;
}


