import * as THREE from './three.module.js';
export const exercises=['standing-forward-fold'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const sec=(((frame%480)+480)%480)/60,amount=sec<.4?0:sec<3.8?smooth((sec-.4)/3.4):sec<4.2?1:sec<7.6?1-smooth((sec-4.2)/3.4):0;
byName.root.position.y+=.35-.15*amount;byName.root.position.z-=1.2*amount;const hipLocal=v(dataByName['upperleg01.L'].head).sub(v(dataByName.root.head)),hinge=q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(70)*amount);byName.root.quaternion.copy(hinge);byName.root.position.add(hipLocal.clone().sub(hipLocal.clone().applyQuaternion(hinge)));
for(const n of ['spine05','spine04','spine03','spine02','spine01'])byName[n].rotation.x=rad(10)*amount;for(const n of ['neck01','neck02','neck03'])byName[n].rotation.x=rad(5)*amount;
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
for(const side of ['L','R']){
const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
const direction=new THREE.Vector3(sign*.22,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
mesh.updateMatrixWorld(true);const upper=rest('upperleg01','lowerleg01'),lower=rest('lowerleg01','foot'),hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(sign*1.963575,-7.033869020080567,.18915),axis=target.clone().sub(hip),d=axis.length(),u=upper.length(),l=lower.length();axis.normalize();const along=(u*u-l*l+d*d)/(2*d),out=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=hip.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,u*u-along*along)));aim('upperleg01.'+side,upper,knee.clone().sub(hip));aim('lowerleg01.'+side,lower,target.clone().sub(knee));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
}
}
