import * as THREE from './three.module.js';
export const exercises=['reverse-nordic-curl'];
const smooth=t=>t*t*t*(t*(t*6-15)+10);
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,depth=t<.4375?smooth(t/.4375):t<.5625?1:1-smooth((t-.5625)/.4375),rotation=q().setFromAxisAngle(v([1,0,0]),rad(-35*depth));
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 byName.root.quaternion.copy(rotation);
 for(const s of ['L','R']){
  aim('upperleg01.'+s,rest('upperleg01.'+s,'lowerleg01.'+s),v([0,-1,0]).applyQuaternion(rotation));
  aim('lowerleg01.'+s,rest('lowerleg01.'+s,'foot.'+s),v([0,0,-1]));
  mesh.updateMatrixWorld(true);byName['foot.'+s].quaternion.copy(byName['foot.'+s].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([1,0,0]),Math.PI)));
 }
 const knee=pos('lowerleg01.L');byName.root.position.add(v([0,-6.6,0]).sub(v([0,knee.y,knee.z])));
 for(const s of ['L','R']){const sign=s==='L'?1:-1;aim('upperarm01.'+s,rest('upperarm01.'+s,'lowerarm01.'+s),v([sign*.12,-1,.1]).applyQuaternion(rotation));aim('lowerarm01.'+s,rest('lowerarm01.'+s,'wrist.'+s),v([-sign*.15,.5,1]).applyQuaternion(rotation));}
 return [];
}
