import * as THREE from './three.module.js';
export const exercises=['ankle-mobility-drill'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10);
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
byName.root.position.y-=.7+.8*amount;byName.root.position.z+=1.6*amount;
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
for(const side of ['L','R']){
const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
const direction=new THREE.Vector3(sign*.4,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
mesh.updateMatrixWorld(true);const upper=rest('upperleg01','lowerleg01'),lower=rest('lowerleg01','foot'),hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(sign*1.1,-7.033869020080567,side==='L'?2:-1.2),axis=target.clone().sub(hip),d=axis.length(),u=upper.length(),l=lower.length();axis.normalize();const along=(u*u-l*l+d*d)/(2*d),out=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=hip.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,u*u-along*along)));aim('upperleg01.'+side,upper,knee.clone().sub(hip));aim('lowerleg01.'+side,lower,target.clone().sub(knee));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
}
}
