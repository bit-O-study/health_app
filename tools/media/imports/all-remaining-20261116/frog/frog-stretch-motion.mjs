import * as THREE from './three.module.js';
export const exercises=['frog-stretch'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));

 byName.root.quaternion.setFromAxisAngle(v([1,0,0]),94*Math.PI/180);byName.root.position.set(0,-2,0);byName.head.quaternion.setFromAxisAngle(v([1,0,0]),-20*Math.PI/180);
 for(const side of ['L','R']){const sign=side==='L'?1:-1;aim('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side),v([sign,-1.02,0]));aim('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side),v([0,.03,-1]));world('foot.'+side,q().setFromAxisAngle(v([0,1,0]),sign*Math.PI/2).multiply(q().setFromAxisAngle(v([0,0,1]),-sign*Math.PI/2)));}
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([0,0,1]),v([-sign,0,0])).multiply(basis(palm,across).invert()));
  aim('upperarm01.'+side,rest('upperarm01.'+side,'lowerarm01.'+side),v([sign*.05,-1,0]));aim('lowerarm01.'+side,rest('lowerarm01.'+side,wrist),v([0,.11,1]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
