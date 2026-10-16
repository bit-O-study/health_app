import * as THREE from './three.module.js';
export const exercises=['reverse-prayer-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10);
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
byName.root.position.y-=3.6;
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
for(const side of ['L','R']){
const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
const upper=rest('upperarm01','lowerarm01'),lower=rest('lowerarm01','wrist');mesh.updateMatrixWorld(true);const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(sign*.1945,.2+1.3*amount,2.6),axis=target.clone().sub(shoulder),d=axis.length(),a=upper.length(),b=lower.length();axis.normalize();const along=(a*a-b*b+d*d)/(2*d),out=new THREE.Vector3(sign,.9-.5*amount,.25);out.addScaledVector(axis,-out.dot(axis)).normalize();const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,a*a-along*along)));
aim('upperarm01.'+side,upper,elbow.clone().sub(shoulder));aim('lowerarm01.'+side,lower,target.clone().sub(elbow));
const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),across=index.clone().sub(little),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head)),world=q().setFromRotationMatrix(basis(new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,-1)).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
}
}
