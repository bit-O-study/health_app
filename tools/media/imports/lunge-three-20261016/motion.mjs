import * as THREE from './three.module.js';
export const exercises=['lunge','pulse-lunge','reverse-lunge'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,pulse=id==='pulse-lunge',reverse=id==='reverse-lunge';
 const open=pulse?1:t<.2?ease(t/.2):t<=.8?1:1-ease((t-.8)/.2);
 let depth=pulse?(t<.25?ease(t/.25):t<=.75?1:1-ease((t-.75)/.25)):(t<.2?0:t<.45?ease((t-.2)/.25):t<=.55?1:1-ease((t-.55)/.25));
 if(pulse&&t>=.25&&t<=.75)depth-=.18*Math.sin((t-.25)/.5*2*Math.PI)**2;
 const stepping=!pulse&&(t<.2||t>.8),stepPhase=t<.2?t/.2:(t-.8)/.2,air=stepping?.8*Math.sin(stepPhase*Math.PI)**2:0;
 byName.root.position.y+=.32-1.5*open-2.7*depth;
 byName.root.position.z+=(reverse?-3.9:4.4)*open;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,rear=side==='R',tilt=rear?rad(60)*open:0,rotation=q().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt);
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  const foot=new THREE.Vector3(sign*1.3,-7.15,.2+(rear?(reverse?-8.3*open:0):(reverse?0:8.3*open)));
  if(rear){const offset=rest('foot.'+side,'toe2-1.'+side);foot.add(offset.clone().sub(offset.clone().applyQuaternion(rotation)));}
  if((reverse&&rear)||(!reverse&&!rear))foot.y+=air;
  mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
  if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable ankle '+id+' '+frame+' '+side+' '+d);
  const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(0,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));
  aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(rotation));
  for(let n=1;n<=5;n++)byName[`toe${n}-1.${side}`].rotation.x=-tilt;
  if(reverse){
   aim('upperarm01.'+side,new THREE.Vector3(sign*.18,-1,.02),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*.18,-1,.10),rest('lowerarm01.'+side,'wrist.'+side));
  }else{
   aim('upperarm01.'+side,new THREE.Vector3(sign*.14,-.8,.6),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*.04,.6,.8),rest('lowerarm01.'+side,'wrist.'+side));
   byName['wrist.'+side].quaternion.identity();
  }
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(reverse?[0,65,80,50][joint]:15)));
 }
}
