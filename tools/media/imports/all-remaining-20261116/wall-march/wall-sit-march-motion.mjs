import * as THREE from './three.module.js';
export const exercises=["wall-sit-march"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,_lift,{byName,dataByName,mesh},frame=0){
 const t=((frame%480)+480)%480/480,half=(t%0.5)*2,smooth=x=>x*x*x*(x*(x*6-15)+10),lift=half<.375?smooth(half/.375):half<.625?1:1-smooth((half-.625)/.375),active=t<.5?'R':'L';
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 byName.root.rotation.x=THREE.MathUtils.degToRad(-1.7);
 for(const s of ['L','R']){const sign=s==='L'?1:-1,hip='upperleg01.'+s,knee='lowerleg01.'+s,foot='foot.'+s;
  const a=THREE.MathUtils.degToRad(s===active?15*lift:0);aim(hip,rest(hip,knee),v([sign*.08,Math.sin(a),Math.cos(a)]));aim(knee,rest(knee,foot),v(id==='single-leg-wall-sit'&&s==='R'?[sign*.08,0,1]:[0,-1,0]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert());
  const upper='upperarm01.'+s,elbow='lowerarm01.'+s,wrist='wrist.'+s;aim(upper,rest(upper,elbow),v([0,0,1]));aim(elbow,rest(elbow,wrist),v([0,0,1]));
 }
 mesh.updateMatrixWorld(true);return [];
}
