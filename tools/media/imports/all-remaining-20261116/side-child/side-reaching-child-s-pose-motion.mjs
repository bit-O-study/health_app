import * as THREE from './three.module.js';
export const exercises=['side-reaching-child-s-pose'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));

 byName.root.quaternion.setFromAxisAngle(v([1,0,0]),85*Math.PI/180);byName.root.position.set(0,-6,0);byName.head.quaternion.setFromAxisAngle(v([1,0,0]),20*Math.PI/180);
 for(const name of ['spine04','spine03','spine02','spine01'])byName[name].quaternion.setFromAxisAngle(v([0,0,1]),-3.75*Math.PI/180);
 const angle=15*Math.PI/180;
 for(const side of ['L','R']){const sign=side==='L'?1:-1;aim('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side),v([sign*.2,-.25,1]));aim('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side),v([-sign*.35,0,-1]));world('foot.'+side,q().setFromAxisAngle(v([1,0,0]),153*Math.PI/180));}
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([Math.sin(angle),0,Math.cos(angle)]),v([-sign*Math.cos(angle),0,sign*Math.sin(angle)])).multiply(basis(palm,across).invert()));
  aim('upperarm01.'+side,rest('upperarm01.'+side,'lowerarm01.'+side),v([Math.sin(angle)+sign*.03,side==='L'?-.20:-.214,Math.cos(angle)]));aim('lowerarm01.'+side,rest('lowerarm01.'+side,wrist),v([Math.sin(angle)+sign*.03,side==='L'?-.20:-.214,Math.cos(angle)]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
