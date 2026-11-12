import * as THREE from './three.module.js';
export const exercises=['bulgarian-split-squat'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const depth=lift;byName.root.position.y-=.7+3*depth;byName.root.position.z-=2.6;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,rear=side==='R',tilt=rear?rad(120):0,rotation=q().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt);
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  const foot=new THREE.Vector3(sign*1.3,rear?-3.45:-7.15,rear?-6.8:.2);
  mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
  if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable ankle '+id+' '+frame+' '+side+' '+d);
  const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(0,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));
  aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(rotation));
  for(let n=1;n<=5;n++)byName[`toe${n}-1.${side}`].rotation.x=0;
  if(true){
   aim('upperarm01.'+side,new THREE.Vector3(sign*.18,-1,.02),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*.18,-1,.10),rest('lowerarm01.'+side,'wrist.'+side));
  }else{
   aim('upperarm01.'+side,new THREE.Vector3(sign*.14,-.8,.6),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*.04,.6,.8),rest('lowerarm01.'+side,'wrist.'+side));
   byName['wrist.'+side].quaternion.identity();
  }
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*([0,65,80,50][joint])));
 }
}
