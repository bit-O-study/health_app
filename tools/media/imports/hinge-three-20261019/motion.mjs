import * as THREE from './three.module.js';
export const exercises=['dumbbell-romanian-deadlift','dumbbell-stiff-leg-deadlift','b-stance-romanian-deadlift'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,stiff=id==='dumbbell-stiff-leg-deadlift',kick=id==='b-stance-romanian-deadlift';
 const depth=t<.45?ease(t/.45):t<.55?1:1-ease((t-.55)/.45);
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 byName.root.position.z-=3.2*depth;
 if(kick)byName.root.position.x+=.35;
 byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad((stiff?65:60)*depth));
 const feet={};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,tilt=kick&&side==='R'?rad(35):0,rotation=q().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt);
  const foot=new THREE.Vector3(sign*1.5,-7.15,kick&&side==='R'?-2:.2);
  if(tilt){const offset=rest('foot.'+side,'toe2-1.'+side);foot.add(offset.clone().sub(offset.clone().applyQuaternion(rotation)));}
  feet[side]={foot,rotation,tilt};
 }
 mesh.updateMatrixWorld(true);
 const hip=byName['upperleg01.L'].getWorldPosition(new THREE.Vector3()),foot=feet.L.foot,u=rest('upperleg01.L','lowerleg01.L'),l=rest('lowerleg01.L','foot.L');
 const lengthSq=u.lengthSq()+l.lengthSq()-2*u.length()*l.length()*Math.cos(rad(stiff?170:155));
 const vertical=Math.sqrt(lengthSq-(hip.x-foot.x)**2-(hip.z-foot.z)**2);
 if(!Number.isFinite(vertical))throw Error('Unreachable hinge');
 byName.root.position.y+=foot.y+vertical-hip.y;
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,{foot,rotation,tilt}=feet[side];
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
  if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable ankle '+id+' '+frame+' '+side);
  const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(0,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));
  aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(rotation));
  for(let n=1;n<=5;n++)byName[`toe${n}-1.${side}`].rotation.x=-tilt;
  aim('upperarm01.'+side,new THREE.Vector3(sign*.14,-1,.02),rest('upperarm01.'+side,'lowerarm01.'+side));
  aim('lowerarm01.'+side,new THREE.Vector3(sign*.14,-1,.10),rest('lowerarm01.'+side,'wrist.'+side));
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][joint]));
 }
}
