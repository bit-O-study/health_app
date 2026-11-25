import * as THREE from './three.module.js';
export const exercises=["pigeon-pose"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 byName.root.quaternion.setFromAxisAngle(v([1,0,0]),THREE.MathUtils.degToRad(15));byName.root.position.set(0,-7,0);
 const orient=(bone,r,d,n)=>{const basis=(x,y)=>{x=x.clone().normalize();y=y.clone().addScaledVector(x,-y.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};world(bone,q().setFromRotationMatrix(basis(d,n).multiply(basis(r,v([0,0,1])).invert())));};
 for(const side of ['L','R']){const thigh=side==='L'?v([.2,-.12,1]):v([0,-.13,-1]),shin=side==='L'?v([-.8,-.04,-.6]):v([0,-.13,-1]);orient('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side),thigh,side==='L'?shin:v([0,-1,0]));orient('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side),shin,side==='L'?thigh.clone().negate():v([0,-1,0]));world('foot.'+side,side==='L'?q().setFromAxisAngle(v([0,1,0]),Math.atan2(-.8,-.6)).multiply(q().setFromAxisAngle(v([0,0,1]),Math.PI/2)):q().setFromAxisAngle(v([1,0,0]),THREE.MathUtils.degToRad(153)));}
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([0,0,1]),v([-sign,0,0])).multiply(basis(palm,across).invert()));
  aim('upperarm01.'+side,rest('upperarm01.'+side,'lowerarm01.'+side),v([sign*.1,-1,.1]));aim('lowerarm01.'+side,rest('lowerarm01.'+side,wrist),v([sign*.1,-1,.1]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
