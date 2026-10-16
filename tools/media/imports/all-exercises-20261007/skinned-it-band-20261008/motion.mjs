import * as THREE from './three.module.js';
export const exercises=['standing-it-band-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
const upper=v(dataByName['lowerleg01.L'].head).sub(v(dataByName['upperleg01.L'].head)),lower=v(dataByName['foot.L'].head).sub(v(dataByName['lowerleg01.L'].head)),length=upper.length()+lower.length(),ankleY=-7.033869020080567,rootX=.25*amount,dx=-.25-(dataByName['upperleg01.L'].head[0]+rootX),dz=-2.3-dataByName['upperleg01.L'].head[2];byName.root.position.x+=rootX;byName.root.position.y+=ankleY+Math.sqrt(length*length-dx*dx-dz*dz)-dataByName['upperleg01.L'].head[1];
for(const [bone,share]of [['spine05',.25],['spine04',.25],['spine03',.2],['spine02',.2],['spine01',.1]])byName[bone].rotation.z=rad(12)*share*amount;
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
for(const side of ['L','R']){
const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
const direction=side==='L'?new THREE.Vector3(.13,.96,.25).applyAxisAngle(new THREE.Vector3(0,0,1),rad(12)*amount):new THREE.Vector3(-.35,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(side==='L'?-.25:.25,ankleY,side==='L'?-2.3:1.3),axis=target.clone().sub(hip),d=axis.length(),u=upper.length(),l=lower.length();axis.normalize();const along=(u*u-l*l+d*d)/(2*d),out=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=hip.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,u*u-along*along)));aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),knee.clone().sub(hip));aim('lowerleg01.'+side,rest('lowerleg01','foot'),target.clone().sub(knee));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
}
}
