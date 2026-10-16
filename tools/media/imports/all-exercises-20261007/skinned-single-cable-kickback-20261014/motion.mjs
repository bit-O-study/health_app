import * as THREE from './three.module.js';
export const exercises=['single-arm-cable-triceps-kickback'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 if(!exercises.includes(id))throw Error(id);
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));mesh.updateMatrixWorld(true);};


 byName.root.position.y-=.516621453191108;byName.spine05.rotation.x=rad(75);
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
  aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(0,-Math.cos(rad(30)),-sign*Math.sin(rad(30))));
  aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));
  byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
  aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),side==='L'?new THREE.Vector3(.18,0,-Math.sqrt(.9676)):new THREE.Vector3(0,-1,0));
  const angle=rad(side==='L'?85*lift:15),forward=side==='L'?new THREE.Vector3(.18,-Math.sqrt(.9676)*Math.cos(angle),-Math.sqrt(.9676)*Math.sin(angle)):new THREE.Vector3(0,-1,0),across=new THREE.Vector3(-sign,0,0);
  aim('lowerarm01.'+side,rest('lowerarm01','wrist'),forward);
  if(side==='R'){
   const sh=byName['upperarm01.R'].getWorldPosition(new THREE.Vector3()),knee=byName['lowerleg01.R'].getWorldPosition(new THREE.Vector3()),target=knee.clone().add(new THREE.Vector3(-.8,1.7,.8)),axis=target.clone().sub(sh),d=axis.length(),a=rest('upperarm01','lowerarm01').length(),b=rest('lowerarm01','wrist').length();
   if(d>a+b)throw Error('Support hand unreachable');axis.normalize();const along=(a*a-b*b+d*d)/(2*d),h=Math.sqrt(a*a-along*along),pole=new THREE.Vector3(-1,0,0).addScaledVector(axis,axis.x).normalize(),ep=sh.clone().addScaledVector(axis,along).addScaledVector(pole,h);
   aim('upperarm01.R',rest('upperarm01','lowerarm01'),ep.clone().sub(sh));aim('lowerarm01.R',rest('lowerarm01','wrist'),target.sub(ep));forward.copy(target).normalize().applyAxisAngle(new THREE.Vector3(1,0,0),rad(-20));
  }
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const world=q().setFromRotationMatrix((side==='R'?basis(forward,across).multiply(basis(palm,index.clone().sub(little)).invert()):basis(across,forward).multiply(basis(index.clone().sub(little),palm).invert())));
  mesh.updateMatrixWorld(true);
  const current=index.clone().sub(little).normalize().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(q()));
  current.addScaledVector(forward,-current.dot(forward)).normalize();
  const twist=Math.atan2(new THREE.Vector3().crossVectors(current,across).dot(forward),current.dot(across));
  byName['lowerarm02.'+side].quaternion.setFromAxisAngle(rest('lowerarm01','wrist').normalize(),twist*.55);

  mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));if(side==='R'){const t=dataByName['finger1-1.R'];aim('finger1-1.R',v(t.tail).sub(v(t.head)),new THREE.Vector3(0,.4,1));}
 }
}




