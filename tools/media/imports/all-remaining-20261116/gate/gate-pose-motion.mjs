import * as THREE from './three.module.js';
export const exercises=['gate-pose'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));},world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}

 byName.root.position.set(0,-4,0);
 for(const name of ['spine05','spine04','spine03','spine02','spine01'])byName[name].quaternion.setFromAxisAngle(v([0,0,1]),-6*Math.PI/180);
 byName.head.quaternion.setFromAxisAngle(v([0,1,0]),-35*Math.PI/180);
 const leg=v([.87,-.46,0]).normalize();
 for(const side of ['L','R']){aim('upperleg01.'+side,rest('upperleg01.'+side,'lowerleg01.'+side),side==='L'?leg:v([0,-1,0]));aim('lowerleg01.'+side,rest('lowerleg01.'+side,'foot.'+side),side==='L'?leg:v([0,0,-1]));world('foot.'+side,side==='L'?q().setFromAxisAngle(v([0,1,0]),Math.PI/2):q().setFromAxisAngle(v([1,0,0]),153*Math.PI/180));}
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));},forward=side==='L'?leg:v([.65,.76,0]),cross=side==='L'?v([0,0,-1]):v([0,0,1]),turn=q().setFromRotationMatrix(basis(forward,cross).multiply(basis(palm,across).invert()));
 if(side==='L'){const target=pos('upperleg01.L').lerp(pos('lowerleg01.L'),.65).add(v([0,.6,0])).sub(palm.clone().applyQuaternion(turn));ik('upperarm01.L','lowerarm01.L',wrist,target,v([1,0,1]));}else{aim('upperarm01.R',rest('upperarm01.R','lowerarm01.R'),forward);aim('lowerarm01.R',rest('lowerarm01.R',wrist),forward);}world(wrist,turn);
 }
 mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
