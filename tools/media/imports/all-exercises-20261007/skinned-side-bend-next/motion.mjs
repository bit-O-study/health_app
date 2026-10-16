import * as THREE from './three.module.js';
export const exercises=['standing-side-bend-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),smooth=t=>t*t*t*(t*(t*6-15)+10);
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 if(!exercises.includes(id))throw Error('Unknown exercise');
 const seconds=(((frame%480)+480)%480)/60,amount=seconds<2?smooth(seconds/2):seconds<5?1:seconds<7?1-smooth((seconds-5)/2):0;
 for(const [bone,share]of [['spine05',.25],['spine04',.25],['spine03',.20],['spine02',.20],['spine01',.10]])byName[bone].rotation.z=-THREE.MathUtils.degToRad(18)*share*amount;
 mesh.updateMatrixWorld(true);
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,upper=v(dataByName['lowerarm01.'+side].head).sub(v(dataByName['upperarm01.'+side].head)),lower=v(dataByName['wrist.'+side].head).sub(v(dataByName['lowerarm01.'+side].head));
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),x=(sign*3.2-shoulder.x)/(upper.length()+lower.length());
  const direction=new THREE.Vector3(x,-Math.sqrt(1-x*x),0);
  for(const [name,rest]of [['upperarm01',upper],['lowerarm01',lower]]){mesh.updateMatrixWorld(true);byName[name+'.'+side].quaternion.copy(byName[name+'.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest.normalize(),direction)));}
  byName['wrist.'+side].quaternion.identity();
 }
}
