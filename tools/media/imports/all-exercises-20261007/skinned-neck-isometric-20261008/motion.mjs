import * as THREE from './three.module.js';
export const exercises=['neck-isometric-hold'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const aim=(name,rest,dir)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),dir.clone().normalize())));};
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,upper=v(dataByName['lowerarm01.'+side].head).sub(v(dataByName['upperarm01.'+side].head)),lower=v(dataByName['wrist.'+side].head).sub(v(dataByName['lowerarm01.'+side].head));
 if(side==='R'){const dir=new THREE.Vector3(-.12,-1,0).normalize();aim('upperarm01.R',upper,dir);aim('lowerarm01.R',lower,dir);byName['wrist.R'].quaternion.identity();continue;}
 mesh.updateMatrixWorld(true);const shoulder=byName['upperarm01.L'].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(1.45,8.8,2.0),axis=target.clone().sub(shoulder),d=axis.length(),a=upper.length(),b=lower.length();axis.normalize();const along=(a*a-b*b+d*d)/(2*d),o=new THREE.Vector3(1,-.2,1),out=o.addScaledVector(axis,-o.dot(axis)).normalize(),elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,a*a-along*along)));aim('upperarm01.L',upper,elbow.clone().sub(shoulder));aim('lowerarm01.L',lower,target.clone().sub(elbow));
 const index=v(dataByName['finger2-1.L'].head),little=v(dataByName['finger5-1.L'].head),across=index.clone().sub(little),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.L'].head)),world=q().setFromRotationMatrix(basis(new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0)).multiply(basis(palm,across).invert()));
 mesh.updateMatrixWorld(true);const forward=target.clone().sub(elbow).normalize(),current=across.clone().normalize().applyQuaternion(byName['wrist.L'].getWorldQuaternion(q())),desired=new THREE.Vector3(0,1,0);current.addScaledVector(forward,-current.dot(forward)).normalize();desired.addScaledVector(forward,-desired.dot(forward)).normalize();const twist=Math.atan2(new THREE.Vector3().crossVectors(current,desired).dot(forward),current.dot(desired));byName['lowerarm02.L'].quaternion.setFromAxisAngle(lower.clone().normalize(),twist*.6);mesh.updateMatrixWorld(true);byName['wrist.L'].quaternion.copy(byName['wrist.L'].parent.getWorldQuaternion(q()).invert().multiply(world));
 for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.L`].quaternion.setFromAxisAngle(across.clone().normalize(),rad(-[0,5,7,5][joint]));
 }
}


