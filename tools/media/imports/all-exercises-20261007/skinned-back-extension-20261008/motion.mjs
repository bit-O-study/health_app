import * as THREE from './three.module.js';
export const exercises=['standing-back-extension-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
 for(const [bone,share]of [['spine05',.3],['spine04',.25],['spine03',.2],['spine02',.15],['spine01',.1]])byName[bone].rotation.x=rad(-12)*share*amount;
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1;mesh.updateMatrixWorld(true);
 const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(sign*2.25,1.95,-1.51),upper=v(dataByName['lowerarm01.'+side].head).sub(v(dataByName['upperarm01.'+side].head)),lower=v(dataByName['wrist.'+side].head).sub(v(dataByName['lowerarm01.'+side].head)),axis=target.clone().sub(shoulder),d=axis.length(),a=upper.length(),b=lower.length();axis.normalize();
 const along=(a*a-b*b+d*d)/(2*d),out=new THREE.Vector3(sign,0,-.4).addScaledVector(axis,-new THREE.Vector3(sign,0,-.4).dot(axis)).normalize(),elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,a*a-along*along)));
 for(const [name,rest,dir]of [['upperarm01',upper,elbow.clone().sub(shoulder)],['lowerarm01',lower,target.clone().sub(elbow)]]){mesh.updateMatrixWorld(true);byName[name+'.'+side].quaternion.copy(byName[name+'.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.normalize(),dir.normalize())));}
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),across=index.clone().sub(little),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
 const world=q().setFromRotationMatrix(basis(new THREE.Vector3(-sign,0,0),new THREE.Vector3(0,-1,0)).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);const forward=target.clone().sub(elbow).normalize(),current=across.clone().normalize().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(q())),desired=new THREE.Vector3(0,-1,0);current.addScaledVector(forward,-current.dot(forward)).normalize();desired.addScaledVector(forward,-desired.dot(forward)).normalize();const twist=Math.atan2(new THREE.Vector3().crossVectors(current,desired).dot(forward),current.dot(desired));byName['lowerarm02.'+side].quaternion.setFromAxisAngle(lower.clone().normalize(),twist*.6);mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
 for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across.clone().normalize(),rad(-sign*[0,5,7,5][joint]));
 }
}




