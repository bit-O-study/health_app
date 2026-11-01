import * as THREE from './three.module.js';
import { applyHinge } from './hinge.mjs';
export const exercises=['trap-bar-romanian-deadlift','trap-bar-calf-raise','eccentric-calf-raise'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
function aim(name,direction,rest,{byName,mesh}){
 mesh.updateMatrixWorld(true);
 const bone=byName[name];
 bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),direction.clone().normalize())));
}
function basis(forward,across){
 const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();
 return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));
}
function handRotation(side,forward,across,dataByName){
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
 const palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
 return q().setFromRotationMatrix(basis(forward,across).multiply(basis(palm,index.sub(little)).invert()));
}
export function applyMotion(id,lift,state,frame){
 const {byName,dataByName,mesh}=state;
 if(!exercises.includes(id))throw Error('Unknown exercise');
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 if(id==='trap-bar-romanian-deadlift')applyHinge(id,lift,state,frame);
 else{
  const t=((frame%480)+480)%480/480;
  const up=id==='eccentric-calf-raise'?.2:.4,hold=id==='eccentric-calf-raise'?.25:.5;
  const amount=t<up?smooth(t/up):t<hold?1:t<.95?1-smooth((t-hold)/(.95-hold)):0;
  const angle=rad(-15+45*amount),axis=new THREE.Vector3(1,0,0);
  const offset=rest('foot.L','toe2-1.L');
  byName.root.position.add(offset.clone().sub(offset.clone().applyAxisAngle(axis,angle)));
  for(const side of ['L','R']){
   byName['foot.'+side].rotation.x=angle;
   for(let n=1;n<=5;n++)byName[`toe${n}-1.${side}`].rotation.x=-angle;
  }
 }
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  const upper=new THREE.Vector3(sign*.14,-1,.02).normalize(),lower=new THREE.Vector3(sign*.14,-1,.1).normalize();
  aim('upperarm01.'+side,upper,rest('upperarm01.'+side,'lowerarm01.'+side),state);
  aim('lowerarm01.'+side,lower,rest('lowerarm01.'+side,'wrist.'+side),state);
  const target=handRotation(side,lower,new THREE.Vector3(0,0,sign),dataByName);
  mesh.updateMatrixWorld(true);
  byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(target));
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][joint]));
 }
}
export function placeSupportHands(state){
 const {byName,dataByName,mesh,dumbbells}=state;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 for(const [i,side] of ['L','R'].entries()){
  const sign=side==='L'?1:-1,rotation=handRotation(side,new THREE.Vector3(0,0,1),new THREE.Vector3(-sign,0,0),dataByName);
  const target=new THREE.Vector3(sign*2.8,3,5).sub(dumbbells[i].position.clone().applyQuaternion(rotation));
  mesh.updateMatrixWorld(true);
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3());
  const upper=rest('upperarm01.'+side,'lowerarm01.'+side),lower=rest('lowerarm01.'+side,'wrist.'+side);
  const axis=target.clone().sub(shoulder),distance=axis.length();axis.normalize();
  if(distance>=upper.length()+lower.length())throw Error('Support out of reach');
  const along=(upper.lengthSq()-lower.lengthSq()+distance*distance)/(2*distance);
  const pole=new THREE.Vector3(sign*.3,-1,0);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(upper.lengthSq()-along*along));
  aim('upperarm01.'+side,elbow.clone().sub(shoulder),upper,state);
  aim('lowerarm01.'+side,target.clone().sub(elbow),lower,state);
  mesh.updateMatrixWorld(true);
  byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(rotation));
 }
}
