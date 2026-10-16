import * as THREE from './three.module.js';
export const exercises=['big-toe-extension'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const sec=(((frame%480)+480)%480)/60,amount=sec<.4?0:sec<3.8?smooth((sec-.4)/3.4):sec<4.2?1:sec<7.6?1-smooth((sec-4.2)/3.4):0;
 byName.root.position.y-=3.6;
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
 aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
 const direction=new THREE.Vector3(sign*.35,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();for(let n=2;n<=5;n++)byName['toe'+n+'-1.'+side].rotation.x=rad(6);byName['toe1-1.'+side].rotation.x=rad(-30)*amount;
 }
}
