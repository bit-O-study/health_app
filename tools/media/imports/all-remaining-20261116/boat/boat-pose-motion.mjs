import * as THREE from './three.module.js';
export const exercises=['boat-pose'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));

 const legAim=(bone,r,d)=>{const basis=(a,n)=>{const x=a.clone().normalize(),y=n.clone().addScaledVector(x,-n.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};world(bone,q().setFromRotationMatrix(basis(d,v([0,1,0])).multiply(basis(r,v([0,0,1])).invert())));};
 byName.root.quaternion.setFromAxisAngle(v([1,0,0]),-35*Math.PI/180);byName.root.position.set(0,-7,0);
 for(const side of ['L','R']){const sign=side==='L'?1:-1,d=v([0,Math.SQRT1_2,Math.SQRT1_2]);legAim('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side),d);legAim('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side),d);world('foot.'+side,q().setFromAxisAngle(v([0,1,0]),sign*0).multiply(q().setFromAxisAngle(v([1,0,0]),-135*Math.PI/180)));}
 for(const side of ['L','R']){
  const wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([0,0,1]),v([0,1,0])).multiply(basis(palm,across).invert()));
  aim('upperarm01.'+side,rest('upperarm01.'+side,'lowerarm01.'+side),v([0,0,1]));aim('lowerarm01.'+side,rest('lowerarm01.'+side,wrist),v([0,0,1]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
