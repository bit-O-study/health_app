import * as THREE from './three.module.js';
export const exercises=['seated-glute-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
let footVertices;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
byName.root.position.y-=3.6;const hipLocal=v(dataByName['upperleg01.L'].head).sub(v(dataByName.root.head)),hinge=q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(15)*amount);byName.root.quaternion.copy(hinge);byName.root.position.add(hipLocal.clone().sub(hipLocal.clone().applyQuaternion(hinge)));
if(!footVertices){footVertices={L:[],R:[]};for(let i=0;i<mesh.geometry.attributes.position.count;i++){const a=mesh.geometry.attributes.position;if(a.getY(i)<-7.5)footVertices[a.getX(i)>0?'L':'R'].push(i);}}
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
for(const side of ['L','R']){
const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head)),upper=rest('upperleg01','lowerleg01'),lower=rest('lowerleg01','foot');
const direction=new THREE.Vector3(sign*.5,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),length=upper.length()+lower.length();let target=new THREE.Vector3(sign*1.52462152,-7.03386876,4.2314152);const fw=side==='R'?q().setFromAxisAngle(new THREE.Vector3(0,0,1),rad(90)):q();
for(let iteration=0;iteration<(side==='R'?1:4);iteration++){
if(side==='R')target.set(1.55,-1.275,3.7);
const axis=target.clone().sub(hip),d=axis.length(),u=upper.length(),l=lower.length();axis.normalize();const along=(u*u-l*l+d*d)/(2*d),out=new THREE.Vector3(side==='R'?-1:0,side==='R'?.2:0,1);out.addScaledVector(axis,-out.dot(axis)).normalize();const knee=hip.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,u*u-along*along)));
aim('upperleg01.'+side,upper,knee.clone().sub(hip));aim('lowerleg01.'+side,lower,target.clone().sub(knee));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(fw));mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const i of footVertices[side]){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p);min=Math.min(min,p.y);}target.y+=-7.751375-min;
}
}
}
