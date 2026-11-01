import * as THREE from './three.module.js';
export const exercises=['dumbbell-squat','1-5-rep-lunge','kettlebell-reverse-lunge'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,squat=id==='dumbbell-squat',partial=id==='1-5-rep-lunge';
 const open=squat?0:t<.15?ease(t/.15):t<=.85?1:1-ease((t-.85)/.15);
 let depth;
 if(squat)depth=t<.45?ease(t/.45):t<.55?1:1-ease((t-.55)/.45);
 else if(partial)depth=t<.15?0:t<.35?ease((t-.15)/.2):t<.5?1-.75*ease((t-.35)/.15):t<.65?.25+.75*ease((t-.5)/.15):t<.85?1-ease((t-.65)/.2):0;
 else depth=t<.15?0:t<.45?ease((t-.15)/.3):t<.55?1:t<.85?1-ease((t-.55)/.3):0;
 const stepping=!squat&&(t<.15||t>.85),stepPhase=t<.15?t/.15:(t-.85)/.15,air=stepping?.8*Math.sin(stepPhase*Math.PI)**2:0;
 byName.root.position.y+=.32-(squat?4.2*depth:1.5*open+2.7*depth);
 byName.root.position.z-=squat?1.4*depth:3.9*open;
 if(squat)byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(16*depth));
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,rear=side==='R',tilt=!squat&&rear?rad(60)*open:0;
  const rotation=q().setFromAxisAngle(new THREE.Vector3(squat?0:1,squat?1:0,0),squat?rad(sign*10):tilt);
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  const foot=new THREE.Vector3(sign*(squat?1.8:1.3),-7.15,.2+(!squat&&rear?-8.3*open:0));
  if(!squat&&rear){const offset=rest('foot.'+side,'toe2-1.'+side);foot.add(offset.clone().sub(offset.clone().applyQuaternion(rotation)));foot.y+=air;}
  mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
  if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable ankle '+id+' '+frame+' '+side+' '+d);
  const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(squat?sign*.15:0,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));
  aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(rotation));
  for(let n=1;n<=5;n++)byName[`toe${n}-1.${side}`].rotation.x=-tilt;
  aim('upperarm01.'+side,new THREE.Vector3(sign*.18,-1,.02),rest('upperarm01.'+side,'lowerarm01.'+side));
  aim('lowerarm01.'+side,new THREE.Vector3(sign*.18,-1,.10),rest('lowerarm01.'+side,'wrist.'+side));
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][joint]));
 }
}
