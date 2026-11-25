import * as THREE from './three.module.js';
export const exercises=["supine-spinal-twist","reclined-spinal-twist"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));

 const roll=90*Math.PI/180,turn=q().setFromAxisAngle(v([0,0,1]),roll);byName.root.quaternion.copy(turn).multiply(q().setFromAxisAngle(v([1,0,0]),-Math.PI/2));byName.root.position.set(0,-7,0);byName.spine05.position.x-=.45;for(const n of ['spine05','spine04','spine03','spine02','spine01'])byName[n].quaternion.setFromAxisAngle(v([0,1,0]),roll/5);for(const n of ['spine05','spine04','spine03','spine02','spine01']){mesh.updateMatrixWorld(true);byName[n].position.add(v([0,-.22,0]).applyQuaternion(byName[n].parent.getWorldQuaternion(q()).invert()));}byName.head.quaternion.setFromAxisAngle(v([0,1,0]),Math.PI/3);
 for(const side of ['L','R']){const d=v([-1,side==='L'?-.36:-.10,0]);aim('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side),d);aim('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side),v([0,side==='L'?-.12:-.05,1]));world('foot.'+side,turn.clone().multiply(q().setFromAxisAngle(v([1,0,0]),-Math.PI/2)));}
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([sign,0,0]),v([0,0,-sign])).multiply(basis(palm,across).invert()));
  aim('upperarm01.'+side,rest('upperarm01.'+side,'lowerarm01.'+side),v([sign,-.095,0]));aim('lowerarm01.'+side,rest('lowerarm01.'+side,wrist),v([sign,-.095,0]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
