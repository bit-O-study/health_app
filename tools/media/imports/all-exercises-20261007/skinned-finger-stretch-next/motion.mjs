import * as THREE from './three.module.js';
export const exercises=['finger-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 if(!exercises.includes(id))throw Error('Unknown exercise');
 const seconds=(((frame%480)+480)%480)/60,open=seconds<.4?0:seconds<3.8?smooth((seconds-.4)/3.4):seconds<=4.2?1:seconds<7.6?1-smooth((seconds-4.2)/3.4):0,closed=1-open;
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const aim=(bone,next,dir)=>{mesh.updateMatrixWorld(true);const rest=v(dataByName[next+'.'+side].head).sub(v(dataByName[bone+'.'+side].head)).normalize();byName[bone+'.'+side].quaternion.copy(byName[bone+'.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest,dir.clone().normalize())));};
  aim('upperarm01','lowerarm01',new THREE.Vector3(sign*.15,-.989,0));aim('lowerarm01','wrist',new THREE.Vector3(0,0,1));
  const dir=new THREE.Vector3(0,0,1),index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),across=index.clone().sub(little).normalize(),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const q=new THREE.Quaternion().setFromRotationMatrix(basis(dir,new THREE.Vector3(-sign,0,0)).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,55,70,40][joint]*closed));
  const forward=v(dataByName['finger3-1.'+side].tail).sub(v(dataByName['finger3-1.'+side].head)).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign),thumb=dataByName['finger1-1.'+side];
  const thumbQ=new THREE.Quaternion().setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());
  byName['finger1-1.'+side].quaternion.identity().slerp(thumbQ,closed);
  for(const joint of [2,3])byName[`finger1-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*0*closed));
 }
}
