import * as THREE from './three.module.js';
export const exercises=['reverse-ez-bar-curl'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 if(!exercises.includes(id))throw Error(id);
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));mesh.updateMatrixWorld(true);};


 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
  aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),new THREE.Vector3(0,-Math.cos(rad(8)),Math.sin(rad(8))));
  const angle=rad(18+98*lift),forward=new THREE.Vector3(0,-Math.cos(angle),Math.sin(angle)),across=new THREE.Vector3(-sign*Math.cos(rad(25)),Math.sin(rad(25))*Math.sin(angle),Math.sin(rad(25))*Math.cos(angle));
  aim('lowerarm01.'+side,rest('lowerarm01','wrist'),forward);
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const world=q().setFromRotationMatrix(basis(across,forward).multiply(basis(index.clone().sub(little),palm).invert()));
  mesh.updateMatrixWorld(true);
  const current=index.clone().sub(little).normalize().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(q()));
  current.addScaledVector(forward,-current.dot(forward)).normalize();
  const twist=Math.atan2(new THREE.Vector3().crossVectors(current,across).dot(forward),current.dot(across));
  byName['lowerarm02.'+side].quaternion.setFromAxisAngle(rest('lowerarm01','wrist').normalize(),twist*.55);

  mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
 }
}




