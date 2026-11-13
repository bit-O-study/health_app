import * as THREE from './three.module.js';
export const exercises=["sled-push"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}




 const pull=false,cycle=(((frame%480)+480)%480)/240,angle=0,grips=[];byName.root.position.y-=pull?.9:1.8;byName.root.position.z-=pull?0:1;byName.root.quaternion.setFromAxisAngle(v([1,0,0]),rad(pull?-8:30));
 for(const side of ['L','R']){const sign=side==='L'?1:-1,p=(cycle+(side==='R'?.5:0))%1,s=Math.max(0,(p-.6)/.4),ease=s*s*s*(s*(s*6-15)+10),z=(pull?-1:1)*(1.8-6*p+6*ease),y=-7.15+(p>.6?.8*Math.sin(Math.PI*s)**2:0);ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,v([sign*1.5,y,z]),v([0,0,1]));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
 const wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign),socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head)),handleAxis=pull?v([1,0,0]):v([0,1,0]),world=q().setFromRotationMatrix(orientation(v([0,0,1]),handleAxis).multiply(orientation(palm,across).invert())),grip=pull?v([sign*2.3,1.4,3.4]):v([sign*3,2.5,6]),target=grip.clone().sub(socket.clone().applyQuaternion(world));ik('upperarm01.'+side,'lowerarm01.'+side,wrist,target,v([sign*.15,-1,-1]));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName['finger'+f+'-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());for(let j=2;j<=3;j++)byName['finger1-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));grips.push({side,grip,socket,handleAxis});
 }return {grips,angle};
}
