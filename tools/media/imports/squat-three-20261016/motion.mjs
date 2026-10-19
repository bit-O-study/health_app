import * as THREE from './three.module.js';
export const exercises=['squat','pulse-squat','chair-pose'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=((frame%480)+480)%480/480,chair=id==='chair-pose';
 let depth;
 if(id==='squat')depth=phase<.45?ease(phase/.45):phase<.55?1:1-ease((phase-.55)/.45);
 else depth=phase<.25?ease(phase/.25):phase<=.75?1:1-ease((phase-.75)/.25);
 if(id==='pulse-squat'&&phase>=.25&&phase<=.75)depth-=.22*Math.sin((phase-.25)/.5*2*Math.PI)**2;
 byName.root.position.y+=.32-(chair?2.5:4.2)*depth;
 byName.root.position.z-=1.4*depth;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 // Lean the pelvis and trunk together, then solve planted ankles in world space.
 byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(16*depth));
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,spread=chair?1.2:1.8;
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3());
  const foot=new THREE.Vector3(sign*spread,-7.15,.2),axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
  if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable ankle '+id+' '+frame);
  const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(sign*.15,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));
  aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  mesh.updateMatrixWorld(true);
  const yaw=q().setFromAxisAngle(new THREE.Vector3(0,1,0),rad(sign*(chair?0:10)));
  byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(yaw));
  const arm=rad(chair?12+145*depth:85),forearm=arm+.07;
  aim('upperarm01.'+side,new THREE.Vector3(sign*.10,-Math.cos(arm),Math.sin(arm)),rest('upperarm01.'+side,'lowerarm01.'+side));
  aim('lowerarm01.'+side,new THREE.Vector3(sign*.08,-Math.cos(forearm),Math.sin(forearm)),rest('lowerarm01.'+side,'wrist.'+side));
  byName['wrist.'+side].quaternion.identity();
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*10));
 }
}
