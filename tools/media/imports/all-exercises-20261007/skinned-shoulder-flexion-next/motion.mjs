import * as THREE from './three.module.js';
export const exercises=['shoulder-flexion-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const seconds=(((frame%480)+480)%480)/60,up=seconds<.4?0:seconds<3.8?smooth((seconds-.4)/3.4):seconds<=4.2?1:seconds<7.6?1-smooth((seconds-4.2)/3.4):0;
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,a=rad(side==='L'?155*up:0),dir=new THREE.Vector3(sign*.12,-Math.cos(a),Math.sin(a)).normalize();
 const aim=(bone,next)=>{mesh.updateMatrixWorld(true);const rest=v(dataByName[next+'.'+side].head).sub(v(dataByName[bone+'.'+side].head)).normalize();byName[bone+'.'+side].quaternion.copy(byName[bone+'.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest,dir)));};
 aim('upperarm01','lowerarm01');aim('lowerarm01','wrist');
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),across=index.clone().sub(little).normalize(),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
 const thumbLeading=new THREE.Vector3(0,Math.sin(a),Math.cos(a));const q=new THREE.Quaternion().setFromRotationMatrix(basis(dir,thumbLeading).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
 for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,10,15,10][joint]));
 }
}
