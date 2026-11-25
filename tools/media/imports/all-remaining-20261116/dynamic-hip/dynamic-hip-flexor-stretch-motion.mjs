import * as THREE from './three.module.js';
export const exercises=['dynamic-hip-flexor-stretch'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh},frame=0){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));},world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' distance='+d+' start='+start.toArray()+' target='+target.toArray());axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 const t=frame/60,raw=t<3.5?t/3.5:t<4.5?1:(8-t)/3.5,u=Math.max(0,Math.min(1,raw)),depth=u*u*u*(u*(u*6-15)+10),angle=15*depth*Math.PI/180,L=rest('upperleg01.R','lowerleg01.R').length();byName.root.quaternion.identity();byName.root.position.set(0,-7.42+L*Math.cos(angle)-.11325,L*Math.sin(angle));
 aim('upperleg01.R',rest('upperleg01.R','lowerleg01.R'),v([0,-Math.cos(angle),-Math.sin(angle)]));aim('lowerleg01.R',rest('lowerleg01.R','foot.R'),v([0,0,-1]));world('foot.R',q().setFromAxisAngle(v([1,0,0]),153*Math.PI/180));ik('upperleg01.L','lowerleg01.L','foot.L',v([1.09765,-7.167494,4.737068]),v([0,1,1]));world('foot.L',q());
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(v([0,0,1]),v([-sign,0,0])).multiply(basis(palm,across).invert())),target=pos('upperleg01.L').lerp(pos('lowerleg01.L'),side==='L'?.55:.82).add(v([sign*.75,.7,0])).sub(palm.clone().applyQuaternion(turn));
  ik('upperarm01.'+side,'lowerarm01.'+side,wrist,target,v([sign,0,0]));world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();
}
