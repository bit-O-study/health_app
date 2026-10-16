import * as THREE from './three.module.js';
export const exercises=['thoracic-rotation'];
const v=a=>new THREE.Vector3().fromArray(a),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const seconds=(((frame%480)+480)%480)/60,up=seconds<.4?0:seconds<3.8?smooth((seconds-.4)/3.4):seconds<=4.2?1:seconds<7.6?1-smooth((seconds-4.2)/3.4):0;
 for(const [bone,share]of [['spine03',.35],['spine02',.35],['spine01',.30]])byName[bone].rotation.y=rad(-30)*share*up;
 const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rad(-30)*up);
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,upper=new THREE.Vector3(sign*Math.sin(rad(70)),-Math.cos(rad(70)),0).applyQuaternion(turn),fore=new THREE.Vector3(sign*Math.cos(rad(70)),Math.sin(rad(70)),0).applyQuaternion(turn);
 const aim=(bone,next,dir)=>{mesh.updateMatrixWorld(true);const rest=v(dataByName[next+'.'+side].head).sub(v(dataByName[bone+'.'+side].head)).normalize();byName[bone+'.'+side].quaternion.copy(byName[bone+'.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest,dir)));};
 aim('upperarm01','lowerarm01',upper);aim('lowerarm01','wrist',fore);
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),across=index.clone().sub(little).normalize(),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
 const toward=new THREE.Vector3(-sign*Math.sin(rad(70)),Math.cos(rad(70)),0).applyQuaternion(turn);const q=new THREE.Quaternion().setFromRotationMatrix(basis(fore,toward).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
 for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,10,15,10][joint]));
 }
}
