import * as THREE from './three.module.js';
export const exercises=['plank'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
let calibratedAngle,forearmIndices,toeIndices;
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 if(id!=='plank')throw Error('Unknown plank');
 const rest=(a,b,s)=>v(dataByName[b+'.'+s].head).sub(v(dataByName[a+'.'+s].head));
 const aim=(name,r,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),target.clone().normalize())));};
 const basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};
 if(!forearmIndices){forearmIndices=[];toeIndices=[];const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;for(let i=0;i<si.count;i++){const inds=[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)],weights=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)],name=mesh.skeleton.bones[inds[weights.indexOf(Math.max(...weights))]].name;if(/^lowerarm/.test(name))forearmIndices.push(i);if(/^toe/.test(name))toeIndices.push(i);}}
 const minimum=indices=>Math.min(...indices.map(i=>mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)).y));
 function setPose(degrees){
  byName.root.position.set(0,0,0);byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(degrees));
  const leg=new THREE.Vector3(0,-Math.cos(rad(degrees)),-Math.sin(rad(degrees)));
  for(const side of ['L','R']){
   const sign=side==='L'?1:-1;
   aim('upperleg01.'+side,rest('upperleg01','lowerleg01',side),leg);aim('lowerleg01.'+side,rest('lowerleg01','foot',side),leg);
   mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(60))));
   aim('upperarm01.'+side,rest('upperarm01','lowerarm01',side),new THREE.Vector3(0,-1,0));
   aim('lowerarm01.'+side,rest('lowerarm01','wrist',side),new THREE.Vector3(0,0,1));
   const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
   const forward=new THREE.Vector3(0,0,1),across=new THREE.Vector3(-sign,0,0),world=q().setFromRotationMatrix(basis(forward,across).multiply(basis(palm,index.clone().sub(little)).invert()));
   mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
   for(let f=1;f<=5;f++)for(let j=1;j<=3;j++){const name=`finger${f}-${j}.${side}`;mesh.updateMatrixWorld(true);const current=byName[name].getWorldQuaternion(q()),old=v(dataByName[name].tail).sub(v(dataByName[name].head)).normalize().applyQuaternion(current),target=forward.clone().addScaledVector(across,f===1?.7:0).normalize();byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(old,target).multiply(current)));}
  }
  mesh.updateMatrixWorld(true);mesh.skeleton.update();
 }
 if(calibratedAngle===undefined){let lo=65,hi=100;for(let i=0;i<40;i++){const mid=(lo+hi)/2;setPose(mid);if(minimum(toeIndices)<minimum(forearmIndices))lo=mid;else hi=mid;}calibratedAngle=(lo+hi)/2;}
 setPose(calibratedAngle);byName.root.position.y+=-7.751375+.02-minimum(forearmIndices);mesh.updateMatrixWorld(true);
}
