import * as THREE from './three.module.js';
export const exercises=['cable-drag-curl'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 if(!exercises.includes(id))throw Error(id);
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));mesh.updateMatrixWorld(true);};


 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const finger=v(dataByName['finger3-1.'+side].tail).sub(v(dataByName['finger3-1.'+side].head)).normalize(),restAcross=index.clone().sub(little).normalize(),inward=new THREE.Vector3().crossVectors(restAcross,finger).normalize().multiplyScalar(-sign),handleRest=palm.clone().addScaledVector(finger,.13).addScaledVector(inward,.18);
  const zero=q().setFromRotationMatrix(basis(new THREE.Vector3(sign,0,0),new THREE.Vector3(0,-1,0)).multiply(basis(index.clone().sub(little),palm).invert())),eff=handleRest.clone().applyQuaternion(zero).add(new THREE.Vector3(0,-rest('lowerarm01','wrist').length(),0)),r=Math.hypot(eff.y,eff.z),phi=Math.atan2(eff.z,-eff.y),l=rest('upperarm01','lowerarm01').length();
  mesh.updateMatrixWorld(true);const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),dy=(-.1+3.1*lift)-shoulder.y,dz=2.0-shoulder.z,d=Math.hypot(dy,dz),u=Math.atan2(dz,-dy)-Math.acos(Math.max(-1,Math.min(1,(l*l+d*d-r*r)/(2*l*d)))),angle=Math.atan2(dz-l*Math.sin(u),-dy-l*Math.cos(u))-phi,forward=new THREE.Vector3(0,-Math.cos(angle),Math.sin(angle)),across=new THREE.Vector3(sign,0,0);
  aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),new THREE.Vector3(0,-Math.cos(u),Math.sin(u)));
  aim('lowerarm01.'+side,rest('lowerarm01','wrist'),forward);
  const world=q().setFromRotationMatrix(basis(across,forward).multiply(basis(index.clone().sub(little),palm).invert()));
  mesh.updateMatrixWorld(true);
  const current=index.clone().sub(little).normalize().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(q()));
  current.addScaledVector(forward,-current.dot(forward)).normalize();
  const twist=Math.atan2(new THREE.Vector3().crossVectors(current,across).dot(forward),current.dot(across));
  byName['lowerarm02.'+side].quaternion.setFromAxisAngle(rest('lowerarm01','wrist').normalize(),twist*.55);

  mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
 }
}




