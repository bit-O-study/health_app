import * as THREE from './three.module.js';
export const exercises=['machine-chest-press','machine-shoulder-press','pec-deck'];
const v=a=>new THREE.Vector3().fromArray(a),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function machineTarget(id,lift,side){
 const sign=side==='L'?1:-1;
 if(id==='machine-chest-press'){const t=rad(20+19*lift);return {pivot:new THREE.Vector3(sign*3,10,0),grip:new THREE.Vector3(sign*3,10-10*Math.cos(t),10*Math.sin(t))};}
 if(id==='machine-shoulder-press'){const t=rad(5+55*lift);return {pivot:new THREE.Vector3(-sign*.8,2.2,1),grip:new THREE.Vector3(sign*(-.8+6.4*Math.cos(t)),2.2+6.4*Math.sin(t),1)};}
 return null;
}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 const rest=(a,b,s)=>v(dataByName[b+'.'+s].head).sub(v(dataByName[a+'.'+s].head));
 const lowerLength=rest('lowerleg01','foot','L').length();
 byName.root.position.y-=dataByName['upperleg01.L'].head[1]-(-7.457725+lowerLength);
 const aim=(name,direction)=>{
  const side=name.split('.').at(-1),end=name.startsWith('upperleg')?'lowerleg01':name.startsWith('lowerleg')?'foot':name.startsWith('upperarm')?'lowerarm01':'wrist';
  const original=rest(name.split('.')[0],end,side);mesh.updateMatrixWorld(true);
  byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(original.normalize(),direction.clone().normalize())));mesh.updateMatrixWorld(true);
 };
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  aim('upperleg01.'+side,new THREE.Vector3(sign*.08,0,1));aim('lowerleg01.'+side,new THREE.Vector3(0,-1,0));
  byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert());mesh.updateMatrixWorld(true);
  const wrist=v(dataByName['wrist.'+side].head),index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
  const palm=index.clone().add(little).multiplyScalar(.5).sub(wrist).normalize(),across=index.clone().sub(little).normalize();
  const desiredPalm=id==='machine-chest-press'?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
  const desiredAcross=new THREE.Vector3(sign,0,0);
  const targetWorld=new THREE.Quaternion().setFromRotationMatrix(orientation(desiredPalm,desiredAcross).multiply(orientation(palm,across).invert()));
  const forward=v(dataByName['finger3-1.'+side].tail).sub(v(dataByName['finger3-1.'+side].head)).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(wrist);
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),lenA=rest('upperarm01','lowerarm01',side).length(),lenB=rest('lowerarm01','wrist',side).length();
  let upperDirection,lowerDirection;
  if(id==='pec-deck'){
   const theta=rad(65-91*lift);upperDirection=new THREE.Vector3(sign*Math.sin(theta),0,Math.cos(theta));lowerDirection=new THREE.Vector3(0,1,0);
  }else{
   const target=machineTarget(id,lift,side).grip.clone().sub(socket.applyQuaternion(targetWorld)),axis=target.clone().sub(shoulder),distance=axis.length();
   if(distance>=lenA+lenB||distance<=Math.abs(lenA-lenB))throw Error('Unreachable '+id+' '+distance);
   axis.normalize();const along=(lenA*lenA-lenB*lenB+distance*distance)/(2*distance),height=Math.sqrt(lenA*lenA-along*along);
   const poleBase=id==='machine-chest-press'?new THREE.Vector3(sign*.4,-1,-.2):new THREE.Vector3(sign,-.4,-.1);
   const pole=poleBase.clone().addScaledVector(axis,-poleBase.dot(axis)).normalize();
   const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,height);
   upperDirection=elbow.clone().sub(shoulder).normalize();lowerDirection=target.clone().sub(elbow).normalize();
  }
  aim('upperarm01.'+side,upperDirection);aim('lowerarm01.'+side,lowerDirection);
  const currentAcross=across.clone().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion())),wantedAcross=across.clone().applyQuaternion(targetWorld);
  const current=currentAcross.addScaledVector(lowerDirection,-currentAcross.dot(lowerDirection)).normalize(),wanted=wantedAcross.addScaledVector(lowerDirection,-wantedAcross.dot(lowerDirection)).normalize();
  const twist=Math.atan2(new THREE.Vector3().crossVectors(current,wanted).dot(lowerDirection),current.dot(wanted));
  byName['lowerarm02.'+side].quaternion.setFromAxisAngle(rest('lowerarm01','wrist',side).normalize(),twist*.55);mesh.updateMatrixWorld(true);
  byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(targetWorld));
 }
}
