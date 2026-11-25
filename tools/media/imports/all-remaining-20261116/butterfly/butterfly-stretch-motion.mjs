import * as THREE from './three.module.js';
export const exercises=['butterfly-stretch'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));},world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 byName.root.quaternion.setFromAxisAngle(v([1,0,0]),20*Math.PI/180);byName.root.position.set(0,-7,0);
 for(const side of ['L','R']){const sign=side==='L'?1:-1;ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,v([sign*.72,-8.20,3]),v([sign,-.05,0]));world('foot.'+side,q().setFromAxisAngle(v([0,0,1]),-sign*Math.PI/2));}
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([0,0,1]),v([-sign,0,0])).multiply(basis(palm,across).invert())),target=pos('foot.'+side).add(v([sign*.2,.7,.4])).sub(palm.clone().applyQuaternion(turn));
  ik('upperarm01.'+side,'lowerarm01.'+side,wrist,target,v([sign,0,0]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
