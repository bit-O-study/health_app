import * as THREE from './three.module.js';
export const exercises=['side-lunge','dumbbell-jump-squat','kettlebell-lunge'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,jump=id==='dumbbell-jump-squat',lateral=id==='side-lunge';
 const open=t<.2?ease(t/.2):t<=.8?1:1-ease((t-.8)/.2);
 let depth=t<.2?0:t<.45?ease((t-.2)/.25):t<=.55?1:1-ease((t-.55)/.25);
 const hop=jump&&t>.42&&t<.60?1.5*Math.sin(Math.PI*(t-.42)/.18):0;
 if(jump)depth=t<.28?.8*ease(t/.28):t<.42?.8*(1-ease((t-.28)/.14)):t<.60?0:t<.73?.55*ease((t-.60)/.13):.55*(1-ease((t-.73)/.27));
 const tip=jump?rad(30)*(t<.42?ease((t-.32)/.10):t<.60?1:1-ease((t-.60)/.08)):0;
 const stepping=!jump&&(t<.2||t>.8),phase=t<.2?t/.2:(t-.8)/.2,air=stepping?.8*Math.sin(phase*Math.PI)**2:0;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 const feet={};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,rear=side==='R',tilt=jump?tip:!lateral&&rear?rad(60)*open:0;
  const rotation=q().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt);
  if(jump)rotation.premultiply(q().setFromAxisAngle(new THREE.Vector3(0,1,0),rad(sign*10)));
  const foot=new THREE.Vector3(sign*(jump?1.8:1.3)+(lateral&&!rear?6.5*open:0),-7.15+hop,.2+(!jump&&!lateral&&!rear?8.3*open:0));
  if(tilt){const offset=rest('foot.'+side,'toe2-1.'+side);const base=jump?offset.clone().applyAxisAngle(new THREE.Vector3(0,1,0),rad(sign*10)):offset;foot.add(base.clone().sub(offset.clone().applyQuaternion(rotation)));}
  if(!jump&&!rear)foot.y+=air;
  feet[side]={foot,rotation,tilt};
 }
 byName.root.position.y+=.32-(jump?4.2*depth:1.5*open+2.7*depth)+hop;
 byName.root.position.z+=jump?-1.4*depth:lateral?-1.2*depth:4.4*open;
 if(jump){byName.root.position.y+=feet.L.foot.y+7.15-hop-.12*tip/rad(30);byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(16*depth));}
 if(lateral){
  byName.root.position.x+=3.25*open+2.75*depth;
  byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(14*depth));
  mesh.updateMatrixWorld(true);const hip=byName['upperleg01.R'].getWorldPosition(new THREE.Vector3()),foot=feet.R.foot;
  const length=(rest('upperleg01.R','lowerleg01.R').length()+rest('lowerleg01.R','foot.R').length())*.997;
  const vertical=Math.sqrt(length*length-(hip.x-foot.x)**2-(hip.z-foot.z)**2);
  if(!Number.isFinite(vertical))throw Error('Lateral stance too wide');
  byName.root.position.y+=foot.y+vertical-hip.y;
 }
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,{foot,rotation,tilt}=feet[side];
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
  if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable ankle '+id+' '+frame+' '+side+' '+d);
  const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(jump?sign*.15:0,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));
  aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(rotation));
  for(let n=1;n<=5;n++)byName[`toe${n}-1.${side}`].rotation.x=-tilt;
  aim('upperarm01.'+side,new THREE.Vector3(sign*.18,-1,lateral?.22:.02),rest('upperarm01.'+side,'lowerarm01.'+side));
  aim('lowerarm01.'+side,new THREE.Vector3(sign*.18,-1,lateral?.30:.10),rest('lowerarm01.'+side,'wrist.'+side));
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][joint]));
 }
}
