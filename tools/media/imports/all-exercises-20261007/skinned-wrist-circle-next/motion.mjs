import * as THREE from './three.module.js';
export const exercises=['wrist-mobility-circle'];
const v=a=>new THREE.Vector3().fromArray(a),smooth=t=>t*t*t*(t*(t*6-15)+10);
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 if(!exercises.includes(id))throw Error('Unknown exercise');
 const seconds=(((frame%480)+480)%480)/60,angle=2*Math.PI*(seconds<4?smooth(seconds/4):1-smooth((seconds-4)/4));
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const aim=(bone,next,dir)=>{mesh.updateMatrixWorld(true);const rest=v(dataByName[next+'.'+side].head).sub(v(dataByName[bone+'.'+side].head)).normalize();byName[bone+'.'+side].quaternion.copy(byName[bone+'.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest,dir.clone().normalize())));};
  aim('upperarm01','lowerarm01',new THREE.Vector3(sign*.15,-.989,0));aim('lowerarm01','wrist',new THREE.Vector3(0,0,1));
  const dir=new THREE.Vector3(sign*.23*Math.sin(angle),.3*Math.cos(angle),1).normalize(),index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const q=new THREE.Quaternion().setFromRotationMatrix(basis(dir,new THREE.Vector3(-sign,0,0)).multiply(basis(palm,index.sub(little)).invert()));mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
 }
}
