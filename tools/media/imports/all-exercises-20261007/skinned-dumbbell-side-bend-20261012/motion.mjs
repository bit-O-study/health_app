import * as THREE from './three.module.js';
export const exercises = ['dumbbell-side-bend'];
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

  for(const n of ['spine05','spine04','spine03','spine02','spine01'])byName[n].rotation.z=-rad(4*lift);mesh.updateMatrixWorld(true);const trunkQ=byName.spine01.getWorldQuaternion(new THREE.Quaternion());
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    let upperDirection=new THREE.Vector3(sign*.12,-.992,0).normalize(),lowerDirection=new THREE.Vector3(sign*.12,-.992,.04).normalize();
    if(side==='R'){
      const shoulder=byName['upperarm01.R'].getWorldPosition(new THREE.Vector3());const target=byName.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-1.6,.3,.25).applyQuaternion(trunkQ));const d=target.clone().sub(shoulder),len=d.length(),n=d.normalize(),la=v(elbow.head).distanceTo(v(upper.head)),lb=v(wrist.head).distanceTo(v(elbow.head));const along=(la*la-lb*lb+len*len)/(2*len),height=Math.sqrt(Math.max(0,la*la-along*along));const pole=new THREE.Vector3(-1,0,.2).applyQuaternion(trunkQ);pole.addScaledVector(n,-pole.dot(n)).normalize();const mid=shoulder.clone().addScaledVector(n,along).addScaledVector(pole,height);upperDirection=mid.clone().sub(shoulder).normalize();lowerDirection=target.sub(mid).normalize();
    }
    aim('upperarm01.'+side,upperRest,upperDirection);
    if(side==='R'){const q=byName['upperarm01.'+side].getWorldQuaternion(new THREE.Quaternion()),current=lowerRest.clone().applyQuaternion(q);current.addScaledVector(upperDirection,-current.dot(upperDirection)).normalize();const wanted=lowerDirection.clone().addScaledVector(upperDirection,-lowerDirection.dot(upperDirection)).normalize();const angle=Math.atan2(new THREE.Vector3().crossVectors(current,wanted).dot(upperDirection),current.dot(wanted));byName['upperarm01.'+side].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(upperRest,angle));mesh.updateMatrixWorld(true);}
    if(side==='R'){const uq=byName['upperarm01.R'].getWorldQuaternion(new THREE.Quaternion()),lr=lowerRest.clone().applyQuaternion(uq),lq=new THREE.Quaternion().setFromUnitVectors(lr,lowerDirection).multiply(uq);byName['lowerarm01.R'].quaternion.copy(byName['lowerarm01.R'].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(lq));mesh.updateMatrixWorld(true);}else aim('lowerarm01.'+side,lowerRest,lowerDirection);
    const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
    const palm=index.clone().add(little).multiplyScalar(.5).sub(v(wrist.head)).normalize();
    const across=index.sub(little).normalize();
    const desiredAcross=side==='R'?new THREE.Vector3(0,0,-1).applyQuaternion(trunkQ):new THREE.Vector3(0,0,1);const handForward=side==='R'?new THREE.Vector3(0,1,0).applyQuaternion(trunkQ):lowerDirection;
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

