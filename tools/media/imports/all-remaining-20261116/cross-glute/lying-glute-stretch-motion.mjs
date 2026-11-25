import * as THREE from './three.module.js';
export const exercises=['piriformis-stretch','lying-glute-stretch'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));},world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 byName.root.quaternion.setFromAxisAngle(v([1,0,0]),-Math.PI/2);byName.root.position.set(0,-6.15,0);byName.spine01.position.z-=.12;
 aim('upperleg01.L',rest('upperleg01.L','lowerleg01.L'),v([-.35,.86,-.46]));aim('lowerleg01.L',rest('lowerleg01.L','foot.L'),v([-.8,-.2,.3]));world('foot.L',q().setFromUnitVectors(v([0,-1,0]),v([-.8,-.2,.3]).normalize()));
 aim('upperleg01.R',rest('upperleg01.R','lowerleg01.R'),v([0,-.022,1]));aim('lowerleg01.R',rest('lowerleg01.R','foot.R'),v([0,-.022,1]));world('foot.R',q().setFromAxisAngle(v([1,0,0]),-50*Math.PI/180));

 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([0,.4,1]),v([sign,0,0])).multiply(basis(palm,across).invert())),target=pos(side==='L'?'lowerleg01.L':'foot.L').add(v([sign*.4,0,0])).sub(palm.clone().applyQuaternion(turn));
  ik('upperarm01.'+side,'lowerarm01.'+side,wrist,target,v([sign,0,0]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
