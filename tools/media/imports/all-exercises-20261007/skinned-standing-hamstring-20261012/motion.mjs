import * as THREE from './three.module.js';
export const exercises=['standing-hamstring-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
let footVertices;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
byName.root.position.y-=.9;const hipLocal=v(dataByName['upperleg01.L'].head).sub(v(dataByName.root.head)),hinge=q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(45+10*amount));byName.root.quaternion.copy(hinge);byName.root.position.add(hipLocal.clone().sub(hipLocal.clone().applyQuaternion(hinge)));
if(!footVertices){footVertices={L:[],R:[]};for(let i=0;i<mesh.geometry.attributes.position.count;i++){const a=mesh.geometry.attributes.position;if(a.getY(i)<-7.5)footVertices[a.getX(i)>0?'L':'R'].push(i);}}
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
for(const side of ['L','R']){
const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head)),upper=rest('upperleg01','lowerleg01'),lower=rest('lowerleg01','foot');
const direction=new THREE.Vector3(sign*.35,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),length=upper.length()+lower.length();let target=new THREE.Vector3(sign*1.1,-7.03386876,0);const fw=q().setFromAxisAngle(new THREE.Vector3(1,0,0),side==='R'?rad(-30):0);
for(let iteration=0;iteration<4;iteration++){
if(side==='R'){const dy=target.y-hip.y;target.x=hip.x;target.z=hip.z+Math.sqrt(length*length-dy*dy);}
const axis=target.clone().sub(hip),d=axis.length(),u=upper.length(),l=lower.length();axis.normalize();const along=(u*u-l*l+d*d)/(2*d),out=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=hip.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,u*u-along*along)));
aim('upperleg01.'+side,upper,knee.clone().sub(hip));aim('lowerleg01.'+side,lower,target.clone().sub(knee));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(fw));mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const i of footVertices[side]){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p);min=Math.min(min,p.y);}target.y+=-7.751375-min;
}
}
mesh.updateMatrixWorld(true);const support=byName['lowerleg01.L'].getWorldPosition(new THREE.Vector3());
for(const side of ['L','R']){const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head)),upper=rest('upperarm01','lowerarm01'),lower=rest('lowerarm01','wrist');mesh.updateMatrixWorld(true);const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),target=support.clone().add(new THREE.Vector3(sign*.75,2.3,side==='L'?.19:.243)),axis=target.clone().sub(shoulder),d=axis.length(),a=upper.length(),b=lower.length();axis.normalize();const along=(a*a-b*b+d*d)/(2*d),out=new THREE.Vector3(sign,0,-.2);out.addScaledVector(axis,-out.dot(axis)).normalize();const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,a*a-along*along)));aim('upperarm01.'+side,upper,elbow.clone().sub(shoulder));aim('lowerarm01.'+side,lower,target.clone().sub(elbow));const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),across=index.clone().sub(little),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head)),world=q().setFromRotationMatrix(basis(new THREE.Vector3(0,-.92,.38),new THREE.Vector3(-sign,0,0)).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));for(let j=1;j<=3;j++){const n='finger1-'+j+'.'+side;aim(n,v(dataByName[n].tail).sub(v(dataByName[n].head)),new THREE.Vector3(0,-.92,.38));}}

}
