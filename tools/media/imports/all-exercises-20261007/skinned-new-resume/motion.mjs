import * as THREE from './three.module.js';
export const exercises=['arm-circle','backward-arm-circle'];
const v=a=>new THREE.Vector3().fromArray(a);
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 if(!exercises.includes(id))throw Error('Unknown exercise');
 const phase=frame/240*Math.PI*2*(id==='arm-circle'?1:-1),radius=.17;
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const dir=new THREE.Vector3(sign*Math.sqrt(1-radius*radius),radius*Math.cos(phase),radius*Math.sin(phase));
  const aim=(name,rest,direction)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest.normalize(),direction.normalize())));};
  const upper=v(dataByName['lowerarm01.'+side].head).sub(v(dataByName['upperarm01.'+side].head));
  const lower=v(dataByName['wrist.'+side].head).sub(v(dataByName['lowerarm01.'+side].head));
  aim('upperarm01.'+side,upper,dir.clone());aim('lowerarm01.'+side,lower,dir.clone());
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const q=new THREE.Quaternion().setFromRotationMatrix(basis(dir,new THREE.Vector3(0,0,1)).multiply(basis(palm,index.sub(little)).invert()));mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
 }
}

