import * as THREE from './three.module.js';
export const exercises=['reverse-warrior'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));},world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+d+' '+start.toArray()+' '+target.toArray());axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 byName.root.quaternion.setFromAxisAngle(v([0,1,0]),-Math.PI/2);byName.root.position.set(0,-4,0);byName.spine05.quaternion.setFromAxisAngle(v([0,0,1]),30*Math.PI/180);
 for(const side of ['L','R']){aim('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side),side==='L'?v([0,0,1]):v([0,-.5044,-Math.sqrt(1-.5044*.5044)]));aim('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side),side==='L'?v([0,-1,0]):v([0,-.5044,-Math.sqrt(1-.5044*.5044)]));world('foot.'+side,side==='L'?q():q().setFromAxisAngle(v([0,1,0]),-80*Math.PI/180));}
 for(const side of ['L','R']){
 const wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),d=side==='L'?v([0,.866,-.5]):v([0,-.5044,-.863]),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},turn=q().setFromRotationMatrix(basis(d,side==='L'?v([1,0,0]):v([0,-.863,.5044])).multiply(basis(palm,across).invert()));
 if(side==='L'){aim('upperarm01.L',rest('upperarm01.L','lowerarm01.L'),d);aim('lowerarm01.L',rest('lowerarm01.L','wrist.L'),d);}else{const target=pos('upperleg01.R').lerp(pos('lowerleg01.R'),.55).add(v([-.7,.2,0])).sub(palm.clone().applyQuaternion(turn));ik('upperarm01.R','lowerarm01.R',wrist,target,v([-1,0,0]));}world(wrist,turn);
 }

 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
