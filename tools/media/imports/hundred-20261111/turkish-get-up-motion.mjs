import * as THREE from './three.module.js';
export const exercises=["turkish-get-up"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,ease=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};

 const rack=1,progress=7*(t<.45?t/.45:t<.55?1:(1-t)/.45),stage=Math.min(6,Math.floor(progress)),u=ease(progress-stage);
 // Hip y/z, trunk pitch/roll, free ankle z/y/pitch, free wrist x/y/z.
 const keys=[[-6.4,0,-90,0,8.5,-6.8,-90,-5,-7.22,-3],[-6.1,0,-75,20,8.5,-6.8,-70,-5,-7.22,-3],[-5.5,0,-40,30,8.5,-6.8,-60,-5,-7.22,-3],[-4.2,0,-50,40,8.5,-6.8,-45,-5,-7.22,-3],[-3.2,-1,-10,60,-3,-6.0576,70,-5,-7.22,-3],[-3,2,0,0,-3,-6.0576,70,-3,-2,1],[-.5,3,0,0,-3,-6.0576,70,-3,0,2],[1.35,4.6,0,0,4.8,-7.15,0,-3,1,4.6]],k=keys[stage].map((x,i)=>THREE.MathUtils.lerp(x,keys[stage+1][i],u));
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));if((a.startsWith('upperleg')||a==='upperarm01.R')&&middle.y< (a==='upperarm01.R'?-7.45:-7.15)){const center=start.clone().addScaledVector(axis,along),radius=Math.sqrt(u.lengthSq()-along*along),up=v([0,1,0]).addScaledVector(axis,-axis.y),scale=up.length(),c=THREE.MathUtils.clamp(((a==='upperarm01.R'?-7.45:-7.15)-center.y)/(radius*scale),-1,1);up.normalize();const across=new THREE.Vector3().crossVectors(axis,up).normalize();if(across.dot(pole)<0)across.negate();middle.copy(center).addScaledVector(up,radius*c).addScaledVector(across,radius*Math.sqrt(1-c*c));}aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 byName.root.quaternion.setFromEuler(new THREE.Euler(rad(k[2]),0,rad(k[3]),'XYZ'));mesh.updateMatrixWorld(true);byName.root.position.add(v([1.09765,k[0],k[1]]).sub(pos('upperleg01.L')));
 const direction=v([0,-Math.cos(Math.PI*rack),Math.sin(Math.PI*rack)]);
 const grips=[];
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
  const foot=side==='L'?v([1.7,-7.15,4.8]):v([-1.7-(stage===3?3*Math.sin(Math.PI*u)**2:0),k[5]+(stage===3||stage===6?.8*Math.sin(Math.PI*u)**2:0),k[4]]),rotation=q().setFromAxisAngle(v([1,0,0]),rad(side==='L'?0:k[6]));
  ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,foot,side==='R'?v([0,.3-.6*ease(progress-4),1]):v([0,1,1]));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(rotation));if(side==='R'&&k[6]>0)for(let n=1;n<=5;n++)byName[`toe${n}-1.${side}`].rotation.x=-rad(k[6]);
  if(side==='R'){ik(upper,elbow,wrist,v([k[7],k[8],k[9]]),v([-.5,-ease(progress),0]));const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),world=q().setFromRotationMatrix(orientation(v([-1,0,0]),v([0,0,1])).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));continue;}
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));
  const world=q().setFromRotationMatrix(orientation(direction,v([1-rack,0,rack]).normalize()).multiply(orientation(palm,across).invert()));
  const offset=socket.clone().applyQuaternion(world),shoulder=pos(upper),grip=v([shoulder.x+.65,shoulder.y+6.2,shoulder.z]);
  ik(upper,elbow,wrist,grip.clone().sub(offset),v([sign*.4,-1+1.4*rack,1]));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
  for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));
  const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));
  grips.push({side,socket,grip,direction,handleAxis:v([1-rack,0,rack]).normalize(),rack});
 }
 return grips;
}
