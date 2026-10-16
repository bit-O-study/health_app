import * as THREE from './three.module.js';
export const exercises=['neck-retraction'];
const v=a=>new THREE.Vector3().fromArray(a);
const smooth=t=>t*t*t*(t*(t*6-15)+10);
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 if(!exercises.includes(id))throw Error('Unknown exercise');
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,dir=new THREE.Vector3(sign*.13,-.99,0).normalize();
  for(const [bone,next] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']]){mesh.updateMatrixWorld(true);const rest=v(dataByName[next+'.'+side].head).sub(v(dataByName[bone+'.'+side].head)).normalize();byName[bone+'.'+side].quaternion.copy(byName[bone+'.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest,dir)));}
  // Keep the hand aligned with its forearm and the natural open-hand rest pose.
  byName['wrist.'+side].quaternion.identity();
 }
 const seconds=(((frame%480)+480)%480)/60;
 const amount=seconds<2?smooth(seconds/2):seconds<5?1:seconds<7?1-smooth((seconds-5)/2):0;
 for(const [name,angle]of [['neck01',-14],['neck02',-8],['neck03',10],['head',12]])byName[name].rotation.x=THREE.MathUtils.degToRad(angle)*amount;
}
