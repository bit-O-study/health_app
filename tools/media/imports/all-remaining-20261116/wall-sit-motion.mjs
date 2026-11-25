import * as THREE from './three.module.js';
export const exercises=['wall-sit','single-leg-wall-sit'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,_lift,{byName,dataByName,mesh}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 for(const s of ['L','R']){const sign=s==='L'?1:-1,hip='upperleg01.'+s,knee='lowerleg01.'+s,foot='foot.'+s;
  aim(hip,rest(hip,knee),v([sign*.08,0,1]));aim(knee,rest(knee,foot),v(id==='single-leg-wall-sit'&&s==='R'?[sign*.08,0,1]:[0,-1,0]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert());
  const upper='upperarm01.'+s,elbow='lowerarm01.'+s,wrist='wrist.'+s;aim(upper,rest(upper,elbow),v([0,0,1]));aim(elbow,rest(elbow,wrist),v([0,0,1]));
 }
 mesh.updateMatrixWorld(true);return [];
}
