import * as THREE from './three.module.js';
export const exercises=["barbell-calf-raise","cable-glute-kickback","band-good-morning"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh}){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),distance=axis.length();if(distance>=u.length()+l.length()||distance<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+id+' '+a+' '+distance);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+distance**2)/(2*distance);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,u.lengthSq()-along**2)));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 const squat=id==='barbell-calf-raise',kick=id==='cable-glute-kickback';
 const ankleAngle=rad(-15+45*lift),axis=v([1,0,0]),offset=rest('foot.L','toe2-1.L');byName.root.position.add(offset.clone().sub(offset.clone().applyAxisAngle(axis,ankleAngle)));for(const side of ['L','R']){byName['foot.'+side].rotation.x=ankleAngle;for(let n=1;n<=5;n++)byName['toe'+n+'-1.'+side].rotation.x=-ankleAngle;}mesh.updateMatrixWorld(true);mesh.skeleton.update();let supportMin=Infinity;const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){if(positions.getY(i)>-7.8)continue;const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(positions,i));if(p.z>=1.45&&p.z<=4.45&&Math.abs(p.x)<=3.5)supportMin=Math.min(supportMin,p.y);}byName.root.position.y+=-8.16-supportMin;
 const grips=[];
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
  const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));
  const rootQ=byName.root.getWorldQuaternion(q()),direction=(kick?v([0,0,1]):v([0,1,0]).applyQuaternion(rootQ)),handleAxis=(kick?v([0,sign,0]):(squat?v([-sign,0,0]):v([0,0,sign])).applyQuaternion(rootQ));
  const world=q().setFromRotationMatrix(orientation(direction,handleAxis).multiply(orientation(palm,across).invert()));
  const grip=kick?v([sign*2.4,3.5,4.7]):v([sign*(squat?3.8:2.5),squat?5.3:6.1,squat?-.99:1.5]).sub(v(dataByName.root.head)).applyQuaternion(rootQ).add(pos('root'));
  ik(upper,elbow,wrist,grip.clone().sub(socket.clone().applyQuaternion(world)),v([sign*.4,-1,squat?-1:.2]).applyQuaternion(rootQ));
  mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
  for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));
  grips.push({side,socket,grip,handleAxis});
 }
 return grips;
}
