import * as THREE from './three.module.js';
export const exercises=['chin-tuck'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh},frame=0){
 byName.root.position.y-=3.6;
 const smooth=t=>t*t*t*(10+t*(-15+6*t)),time=frame/60,depth=time<3?smooth(time/3):time<5?1:smooth(Math.max(0,(8-time)/3));
 for(const name of ['neck01','neck02','neck03'])byName[name].position.z-=.12*depth;
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
 aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
 const direction=new THREE.Vector3(sign*.35,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
 }
}
