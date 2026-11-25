import * as THREE from './three.module.js';
export const exercises=['heel-touch'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame=0){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));},world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 const wave=Math.sin((frame===480?0:frame)*Math.PI/240);
 byName.root.quaternion.setFromAxisAngle(v([1,0,0]),-Math.PI/2);byName.root.position.set(0,-7.36,0);
 for(const [n,w]of [['spine05',.1],['spine04',.15],['spine03',.2],['spine02',.25],['spine01',.3]])byName[n].quaternion.setFromEuler(new THREE.Euler(rad(20*w),0,rad(-18*wave*w),'XYZ'));
 for(const side of ['L','R']){const sign=side==='L'?1:-1;ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,v([sign*2,-7.15,3.6]),v([0,1,0]));world('foot.'+side,q());}
 for(const side of ['L','R']){const sign=side==='L'?1:-1,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side,target=v([sign*2.7,-7,2.8]),dir=target.sub(pos(upper)).normalize();aim(upper,rest(upper,elbow),dir);aim(elbow,rest(elbow,wrist),dir);
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};world(wrist,q().setFromRotationMatrix(basis(dir,v([-sign,0,0])).multiply(basis(palm,across).invert())));}
}
