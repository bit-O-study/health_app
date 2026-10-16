import * as THREE from './three.module.js';
export function applySupport(state){for(const side of ['L','R']){const sign=side==='L'?1:-1;const {mesh}=state;const remap=o=>new Proxy(o,{get:(obj,k)=>obj[typeof k==='string'?k.replace(/\.R$/,'.'+side):k]});const byName=remap(state.byName),dataByName=remap(state.dataByName);
 const V=a=>new THREE.Vector3().fromArray(a),Q=()=>new THREE.Quaternion();
 const upper=V(dataByName['lowerarm01.R'].head).sub(V(dataByName['upperarm01.R'].head)),lower=V(dataByName['wrist.R'].head).sub(V(dataByName['lowerarm01.R'].head));
 mesh.updateMatrixWorld(true);
 const shoulder=byName['upperarm01.R'].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(sign*2.2,2.5,3),delta=target.clone().sub(shoulder),distance=delta.length(),axis=delta.normalize();
 const along=(upper.lengthSq()-lower.lengthSq()+distance*distance)/(2*distance),pole=new THREE.Vector3(sign,0,-.3);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper.lengthSq()-along*along)));
 for(const [name,rest,direction] of [['upperarm01.R',upper,elbow.clone().sub(shoulder)],['lowerarm01.R',lower,target.clone().sub(elbow)]]){mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(Q()).invert().multiply(Q().setFromUnitVectors(rest.normalize(),direction.normalize())));}
 mesh.updateMatrixWorld(true);
 const index=V(dataByName['finger2-1.R'].head),little=V(dataByName['finger5-1.R'].head),palm=index.clone().add(little).multiplyScalar(.5).sub(V(dataByName['wrist.R'].head));
 const world=Q().setFromRotationMatrix(orientation(new THREE.Vector3(0,0,1),new THREE.Vector3(-sign,0,0)).multiply(orientation(palm,index.sub(little)).invert()));
 byName['wrist.R'].quaternion.copy(byName['wrist.R'].parent.getWorldQuaternion(Q()).invert().multiply(world));
}}
export const exercises = ['standing-toe-raise'];
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
    const alternating=id==='alternating-dumbbell-front-raise';
    const t=((frame%480)+480)%480/480,smooth=x=>x*x*x*(x*(x*6-15)+10);
    let amount=lift,roll=0;
    if(alternating){
      const active=side==='L'?t<.5:t>=.5;
      const phase=(t% .5)*2;
      amount=active?(phase<.4?smooth(phase/.4):phase<.46?1:phase<.96?1-smooth((phase-.46)/.5):0):0;
    }
    if(id==='zottman-curl'){
      amount=t<.34?smooth(t/.34):t<.49?1:t<.88?1-smooth((t-.49)/.39):0;
      roll=t<.35?0:t<.47?smooth((t-.35)/.12):t<.90?1:t<.99?1-smooth((t-.90)/.09):0;
    }
    const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
    const upperRest=v(elbow.head).sub(v(upper.head)).normalize();
    const lowerRest=v(wrist.head).sub(v(elbow.head)).normalize();
    let angle=8, upperDirection=new THREE.Vector3(sign*.17,-.985,0).normalize();
    angle=5;
    let lowerDirection=new THREE.Vector3(sign*.17,-.985,0).normalize().applyAxisAngle(xAxis,-rad(angle));
    let desiredAcross=new THREE.Vector3(0,0,sign);
    if(id==='wide-dumbbell-curl'){
      const axis=new THREE.Vector3(0,1,0);
      lowerDirection.applyAxisAngle(axis,sign*rad(40));
      desiredAcross.applyAxisAngle(axis,sign*rad(40));
    }
    if(alternating){
      upperDirection.applyAxisAngle(xAxis,-rad(80*amount));angle=80*amount+8;
      lowerDirection=new THREE.Vector3(sign*.17,-.985,0).normalize().applyAxisAngle(xAxis,-rad(angle));
      desiredAcross.set(-sign,0,0);
      byName['clavicle.'+side].rotation.z=sign*rad(2*amount);
      byName['shoulder01.'+side].rotation.x=-rad(5*amount);
    }
    if(id==='scaption'){
      const plane=new THREE.Vector3(sign*Math.cos(rad(35)),0,Math.sin(rad(35)));
      const elevation=rad(8+74*amount),lowerElevation=elevation+rad(6);
      upperDirection=plane.clone().multiplyScalar(Math.sin(elevation));upperDirection.y=-Math.cos(elevation);
      lowerDirection=plane.clone().multiplyScalar(Math.sin(lowerElevation));lowerDirection.y=-Math.cos(lowerElevation);
      desiredAcross=plane.clone().multiplyScalar(Math.cos(lowerElevation));desiredAcross.y=Math.sin(lowerElevation);
      byName['clavicle.'+side].rotation.z=sign*rad(4*amount);
      byName['shoulder01.'+side].rotation.z=sign*rad(10*amount);
      byName['shoulder01.'+side].rotation.x=-rad(4*amount);
    }
    aim('upperarm01.'+side,upperRest,upperDirection);
    if(id==='wide-dumbbell-curl')byName['upperarm01.'+side].rotateOnAxis(upperRest,-sign*rad(40));
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
    // Add the continuous roll after measuring the neutral reference, avoiding
    // an atan2 wrap that would snap the forearm skin halfway through a turn.
    const extraRoll=sign*Math.PI*roll;
    const twist=Math.atan2(new THREE.Vector3().crossVectors(current,wanted).dot(lowerDirection),current.dot(wanted))+extraRoll;
    targetWorld.premultiply(new THREE.Quaternion().setFromAxisAngle(lowerDirection,extraRoll));
    byName['lowerarm02.'+side].quaternion.setFromAxisAngle(lowerRest,twist*.55);
    mesh.updateMatrixWorld(true);
    const parentWorld=byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion());
    byName['wrist.'+side].quaternion.copy(parentWorld.invert().multiply(targetWorld));
  }
  // Rotate the hindfoot about the metatarsal pivot. Translate the proximal
  // skeleton only by the ankle displacement required by that fixed pivot.
  const a=rad(-25*lift),axis=new THREE.Vector3(1,0,0);
  const ankle=v(dataByName['foot.L'].head),pivot=new THREE.Vector3(1.921375,-8.164806,-.0299375);
  const displacement=pivot.clone().sub(ankle).sub(pivot.clone().sub(ankle).applyAxisAngle(axis,a));
  byName.root.position.add(displacement);
  for(const side of ['L','R']){
    byName['foot.'+side].rotation.x=a;
    
  }


}
