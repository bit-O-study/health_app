import * as THREE from './three.module.js';
export const exercises=['scapular-pull-up'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 lift=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),distance=axis.length();if(distance>=u.length()+l.length()||distance<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+id+' '+a+' '+distance);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+distance**2)/(2*distance);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,u.lengthSq()-along**2)));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 if(id==='scapular-pull-up'){byName.root.position.y+=-.25+.45*lift;byName.root.position.z-=.8;}
 if(id==='lat-pulldown'){byName.root.position.y-=3;byName.root.rotation.x=rad(-8);}
 if(id==='leg-press'){byName.root.position.y-=3;byName.root.position.z-=3;byName.root.rotation.x=rad(-45);}
 const grips=[];
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side;
  if(id==='lat-pulldown'){
   aim(hip,rest(hip,knee),v([sign*.07,0,1]));aim(knee,rest(knee,foot),v([0,-1,0]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert());
  }
  if(id==='leg-press'){
   const u=rest(hip,knee),l=rest(knee,foot),distance=Math.sqrt(u.lengthSq()+l.lengthSq()-2*u.length()*l.length()*Math.cos(rad(95+70*lift))),target=pos(hip).addScaledVector(v([0,Math.SQRT1_2,Math.SQRT1_2]),Math.sqrt(distance**2-(sign*1.6-pos(hip).x)**2));
   target.x=sign*1.6;ik(hip,knee,foot,target,v([sign*.05,1,-1]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([1,0,0]),rad(-135))));
  }
  byName['clavicle.'+side].position.y-=.45*lift;
  const upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));
  const direction=id==='leg-press'?v([0,-1,0]):v([0,1,0]);
  const world=q().setFromRotationMatrix(orientation(direction,v([-sign,0,0])).multiply(orientation(palm,across).invert()));
  const grip=id==='scapular-pull-up'?v([sign*2.5,11,1.2]):id==='lat-pulldown'?v([sign*3.6,8.4-4.9*lift,1.8]):v([sign*2.8,-3.4,-4.4]);
  if(side==='L'){const target=grip.clone().sub(socket.clone().applyQuaternion(world)),sh=pos(upper),a=rest(upper,elbow).length(),b=rest(elbow,wrist).length(),d2=a*a+b*b-2*a*b*Math.cos(rad(175));byName.root.position.y+=target.y-Math.sqrt(d2-(target.x-sh.x)**2-(target.z-sh.z)**2)-sh.y;}
  ik(upper,elbow,wrist,grip.clone().sub(socket.clone().applyQuaternion(world)),v([sign,-1,id==='leg-press'?1:0]));
  mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
  for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));
  const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());
  for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));
  grips.push({side,socket,grip});
 }
 return grips;
}

