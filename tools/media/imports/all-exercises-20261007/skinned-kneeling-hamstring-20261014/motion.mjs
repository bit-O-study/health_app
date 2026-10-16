import * as THREE from './three.module.js';
export const exercises=['kneeling-hamstring-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad,smooth=t=>t*t*t*(t*(t*6-15)+10);let regions;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const t=(((frame%480)+480)%480)/60,a=t<2?smooth(t/2):t<5?1:t<7?1-smooth((t-5)/2):0;
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
if(!regions){regions={knee:[],foot:[]};const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){if(p.getX(i)>0&&p.getY(i)>-3.6&&p.getY(i)<-2.7)regions.knee.push(i);if(p.getX(i)<0&&p.getY(i)<-7.5)regions.foot.push(i);}}
const hipLocal=v(dataByName['upperleg01.L'].head).sub(v(dataByName.root.head)),hinge=q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(15+30*a));byName.root.quaternion.copy(hinge);byName.root.position.add(hipLocal.clone().sub(hipLocal.clone().applyQuaternion(hinge)));byName.root.position.y-=4.3;
const rest=(side,a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
for(const side of ['L','R']){const sign=side==='L'?1:-1;aim('upperarm01.'+side,rest(side,'upperarm01','lowerarm01'),new THREE.Vector3(sign*.4,-1,0));aim('lowerarm01.'+side,rest(side,'lowerarm01','wrist'),new THREE.Vector3(sign*.4,-1,0));byName['wrist.'+side].quaternion.identity();}
aim('upperleg01.L',rest('L','upperleg01','lowerleg01'),new THREE.Vector3(0,-1,0));aim('lowerleg01.L',rest('L','lowerleg01','foot'),new THREE.Vector3(0,0,-1));mesh.updateMatrixWorld(true);byName['foot.L'].quaternion.copy(byName['foot.L'].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(156))));
const min=ids=>{mesh.updateMatrixWorld(true);mesh.skeleton.update();let m=Infinity;for(const i of ids){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p);m=Math.min(m,p.y);}return m;};byName.root.position.y+=-7.731375-min(regions.knee);
let pitch=-.5;for(let k=0;k<5;k++){const dir=new THREE.Vector3(0,pitch,Math.sqrt(1-pitch*pitch));aim('upperleg01.R',rest('R','upperleg01','lowerleg01'),dir);aim('lowerleg01.R',rest('R','lowerleg01','foot'),dir);mesh.updateMatrixWorld(true);byName['foot.R'].quaternion.copy(byName['foot.R'].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(-40))));pitch+=(-7.731375-min(regions.foot))/(rest('R','upperleg01','lowerleg01').length()+rest('R','lowerleg01','foot').length());}
}
