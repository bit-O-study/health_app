import * as THREE from './three.module.js';
export const exercises=['hip-thrust'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh,model,geometry}){
 if(id!=='hip-thrust')throw Error(id);
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),distance=axis.length();if(distance>=u.length()+l.length()||distance<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+distance);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+distance**2)/(2*distance);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,u.lengthSq()-along**2)));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 const rotation=q().setFromAxisAngle(v([1,0,0]),rad(-50-40*lift));
 const anchor=v([0,4.6,-1.1]),support=v([0,-3,-4]);
 byName.root.quaternion.copy(rotation);
 byName.root.position.copy(support.clone().sub(anchor.clone().sub(v(dataByName.root.head)).applyQuaternion(rotation)));
 mesh.updateMatrixWorld(true);let backGap=Infinity;
 for(let i=0;i<model.vertices.length/3;i++){const r=v(model.vertices.slice(i*3,i*3+3));if(Math.abs(r.x)<1.3&&r.y>4.3&&r.y<4.9&&r.z<-.6){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));backGap=Math.min(backGap,p.y+3);}}
 byName.root.position.y-=backGap;support.y-=backGap;
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side;
  ik(hip,knee,foot,v([sign*1.65,-6.15,4.05]),v([0,1,1]));
  mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert());
 }
 mesh.updateMatrixWorld(true);
 const bar=v([0,.7,1.35]).sub(anchor).applyQuaternion(rotation).add(support),normal=v([0,0,1]).applyQuaternion(rotation);
 const hipSurface=[];for(let i=0;i<model.vertices.length/3;i++){const r=v(model.vertices.slice(i*3,i*3+3));if(Math.abs(r.x)<1.5&&r.y>0&&r.y<1.5&&r.z>.5)hipSurface.push(mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)));}
 for(let step=0;step<150;step++){const gap=Math.min(...hipSurface.map(p=>Math.hypot(p.y-bar.y,p.z-bar.z)-.5));if(gap>=.015)break;bar.addScaledVector(normal,.01);if(step===149)throw Error('Pad contact unresolved');}
 const grips=[];
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));
  const world=q().setFromRotationMatrix(orientation(v([0,-.7,.7]),v([-sign,0,0])).multiply(orientation(palm,across).invert()));
  const grip=bar.clone();grip.x=sign*2.7;
  ik(upper,elbow,wrist,grip.clone().sub(socket.clone().applyQuaternion(world)),v([sign,1,0]));
  mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
  for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));
  const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());
  for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));
  grips.push({side,socket,grip});
 }
 return {grips,bar,support,rotation,anchor};
}
