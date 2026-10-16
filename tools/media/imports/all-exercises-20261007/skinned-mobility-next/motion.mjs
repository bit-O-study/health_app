import * as THREE from './three.module.js';
export const exercises=['neck-flexion','neck-lateral-flexion'];
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
 const axis=id==='neck-flexion'?'x':'z',angle=THREE.MathUtils.degToRad(id==='neck-flexion'?32:-25)*amount;
 for(const [name,fraction]of [['neck01',.30],['neck02',.30],['neck03',.25],['head',.15]])byName[name].rotation[axis]=angle*fraction;
}
