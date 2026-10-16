import * as THREE from './three.module.js';
export const exercises=['upper-trap-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
 byName.root.position.y-=3.6;
 const rise=(a,c,t)=>smooth(Math.max(0,Math.min(1,(t-a)/(c-a)))),sideAmount=sec<5?rise(0,1.25,sec):1-rise(5.75,7,sec),forwardAmount=sec<5?rise(1,2,sec):1-rise(5,6,sec);for(const [bone,share]of [['neck01',.30],['neck02',.30],['neck03',.25],['head',.15]]){byName[bone].rotation.z=rad(-20)*share*sideAmount;byName[bone].rotation.x=rad(10)*share*forwardAmount;}
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
 aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
 const direction=new THREE.Vector3(sign*.35,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
 }
}
