import * as THREE from './three.module.js';
export const exercises = ['alternating-dumbbell-curl','cross-body-hammer-curl','dumbbell-reverse-curl','single-arm-dumbbell-shoulder-press'];
const v = a => new THREE.Vector3().fromArray(a);
const rad = THREE.MathUtils.degToRad;
const xAxis = new THREE.Vector3(1,0,0);
function orientation(forward, across) {
  const x = forward.clone().normalize();
  const y = across.clone().addScaledVector(x,-across.dot(x)).normalize();
  return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));
}
export function applyMotion(id, lift, {byName,dataByName,mesh}, frame) {
  if(!exercises.includes(id))throw new Error('Unknown exercise: '+id);
  const aim = (name, rest, direction) => {
    const bone=byName[name]; mesh.updateMatrixWorld(true);
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest.clone().normalize(),direction.clone().normalize())));
    mesh.updateMatrixWorld(true);
  };
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const alternating=id==='alternating-dumbbell-curl'||id==='cross-body-hammer-curl';
    let amount=lift;
    if(alternating){
      const t=((frame%480)+480)%480/480,active=side==='L'?t<.5:t>=.5;
      const phase=(t% .5)*2,smooth=x=>x*x*x*(x*(x*6-15)+10);
      amount=active?(phase<.4?smooth(phase/.4):phase<.46?1:phase<.96?1-smooth((phase-.46)/.5):0):0;
    }
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    let angle=8, upperDirection=new THREE.Vector3(sign*.17,-.985,0).normalize();
    angle+=(id==='dumbbell-reverse-curl'?98:108)*amount;
    let lowerDirection=new THREE.Vector3(sign*.17,-.985,0).normalize().applyAxisAngle(xAxis,-rad(angle));
    if(id==='cross-body-hammer-curl'){
      const start=new THREE.Vector3(sign*.17,-.975,.137).normalize(),end=new THREE.Vector3(-sign*.63,.40,.665).normalize();
      const turn=new THREE.Quaternion().setFromUnitVectors(start,end);
      lowerDirection=start.applyQuaternion(new THREE.Quaternion().identity().slerp(turn,amount));
    }
    if(id==='single-arm-dumbbell-shoulder-press'){
      if(side==='L'){
        upperDirection=new THREE.Vector3(.94,-.34,.08).lerp(new THREE.Vector3(.17,.982,.08),lift).normalize();
        lowerDirection=new THREE.Vector3(-.08,.995,.03).lerp(new THREE.Vector3(-.13,.991,.03),lift).normalize();
        byName['clavicle.'+side].rotation.z=rad(6*lift);
        byName['shoulder01.'+side].rotation.z=rad(20*lift);
      }else lowerDirection=new THREE.Vector3(sign*.17,-.975,.137).normalize();
    }
    aim('upperarm01.'+side,upperRest,upperDirection);
    aim('lowerarm01.'+side,lowerRest,lowerDirection);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();
    const desiredAcross=id==='alternating-dumbbell-curl'?new THREE.Vector3(sign,0,0):id==='dumbbell-reverse-curl'||(id==='single-arm-dumbbell-shoulder-press'&&side==='L')?new THREE.Vector3(-sign,0,0):lowerDirection.clone().cross(xAxis).normalize();
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
