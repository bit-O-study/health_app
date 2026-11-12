import * as THREE from './three.module.js';
export const exercises=["close-grip-lat-pulldown","hip-adduction-machine","kettlebell-press"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),distance=axis.length();if(distance>=u.length()+l.length()||distance<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+id+' '+a+' '+distance);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+distance**2)/(2*distance);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,u.lengthSq()-along**2)));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 const lat=id==='close-grip-lat-pulldown',add=id==='hip-adduction-machine';
 if(lat||add)byName.root.position.y-=dataByName['upperleg01.L'].head[1]-(-7.057725+rest('lowerleg01.L','foot.L').length());else byName.root.position.y+=.4;
 const grips=[];
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side;
  if(lat||add){const t=rad(add?40-35*lift:5);aim(hip,rest(hip,knee),v([sign*Math.sin(t),0,Math.cos(t)]));aim(knee,rest(knee,foot),v([0,-1,0]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([0,1,0]),sign*t)));}
  const upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));
  const active=!lat&&!add&&side==='L',direction=lat||active?v([0,1,0]):v([0,-1,0]),handleAxis=v([0,0,sign]);
  const world=q().setFromRotationMatrix(orientation(direction,handleAxis).multiply(orientation(palm,across).invert()));
  const grip=lat?v([sign*.85,7.3-5.1*lift,2.8]):add?v([sign*2.9,-3.7,0]):active?v([2.8,6.7+5.72*lift,1.7-1.2*lift]):v([-3,0,.3]);
  ik(upper,elbow,wrist,grip.clone().sub(socket.clone().applyQuaternion(world)),lat?v([sign*.3,-1,.5]):add?v([sign*.2,-.4,-1]):v([sign*.5,-.5,.8]));
  mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
  if(lat||add||active){for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));}
  grips.push({side,socket,grip,handleAxis});
 }
 return grips;
}
