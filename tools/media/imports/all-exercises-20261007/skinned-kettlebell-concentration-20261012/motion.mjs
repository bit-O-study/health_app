import * as THREE from './three.module.js';
export const exercises=['kettlebell-concentration-curl'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 if(!exercises.includes(id))throw Error(id);
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));mesh.updateMatrixWorld(true);};


 byName.root.position.y-=3.6;byName.spine05.rotation.x=rad(55);
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
  aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.37,-.05,1));aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
  aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),new THREE.Vector3(-sign*.095,-Math.cos(rad(5)),Math.sin(rad(5))));
  const angle=rad(24+102*lift);let forward=new THREE.Vector3(0,-Math.cos(angle),Math.sin(angle)),across=new THREE.Vector3(sign,0,0);
 if(side==='R'){const shoulder=byName['upperarm01.R'].getWorldPosition(new THREE.Vector3()),goal=new THREE.Vector3(-2.6,-1.6,3.3),d=goal.clone().sub(shoulder),length=d.length(),a=rest('upperarm01','lowerarm01').length(),b=rest('lowerarm01','wrist').length(),unit=d.normalize(),x=(a*a-b*b+length*length)/(2*length),h=Math.sqrt(a*a-x*x),out=new THREE.Vector3(0,-.4,-1);out.addScaledVector(unit,-out.dot(unit)).normalize();const elbow=shoulder.clone().addScaledVector(unit,x).addScaledVector(out,h);aim('upperarm01.R',rest('upperarm01','lowerarm01'),elbow.clone().sub(shoulder));forward=goal.clone().sub(elbow).normalize();across=new THREE.Vector3(1,0,0);}
 
  aim('lowerarm01.'+side,rest('lowerarm01','wrist'),forward);
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const world=q().setFromRotationMatrix(basis(across,side==='R'?new THREE.Vector3(0,-.3,1):forward).multiply(basis(index.clone().sub(little),palm).invert()));
  mesh.updateMatrixWorld(true);
  const current=index.clone().sub(little).normalize().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(q()));
  current.addScaledVector(forward,-current.dot(forward)).normalize();
  const twist=Math.atan2(new THREE.Vector3().crossVectors(current,across).dot(forward),current.dot(across));
  byName['lowerarm02.'+side].quaternion.setFromAxisAngle(rest('lowerarm01','wrist').normalize(),twist*.55);

  mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
 }
}




