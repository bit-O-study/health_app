import * as THREE from './three.module.js';
export const exercises=['face-pull'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion();
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 if(!exercises.includes(id))throw Error(id);
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));mesh.updateMatrixWorld(true);};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
  mesh.updateMatrixWorld(true);
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3());
  const target=new THREE.Vector3(sign*(1.7+1.6*lift),7.2+.2*lift,4.9-3.1*lift);
  const d=target.clone().sub(shoulder),distance=d.length(),axis=d.normalize(),a=rest('upperarm01','lowerarm01').length(),b=rest('lowerarm01','wrist').length();
  if(distance>=a+b||distance<=Math.abs(a-b))throw Error('Unreachable face pull');
  const x=(a*a-b*b+distance*distance)/(2*distance),pole=new THREE.Vector3(sign,-.25,-.15);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const elbow=shoulder.clone().addScaledVector(axis,x).addScaledVector(pole,Math.sqrt(a*a-x*x));
  const forward=target.clone().sub(elbow).normalize(),across=new THREE.Vector3(0,1-.7*lift,.7*lift);
  aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),elbow.clone().sub(shoulder));
  aim('lowerarm01.'+side,rest('lowerarm01','wrist'),forward);
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const world=q().setFromRotationMatrix(basis(across,forward).multiply(basis(index.clone().sub(little),palm).invert()));
  mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
 }
}
