import * as THREE from './three.module.js';
export const exercises=['step-jack','squat-jack','high-knee-skip'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=((frame%240)+240)%240/240,theta=phase*2*Math.PI;
 const step=id==='step-jack',squat=id==='squat-jack';
 const half=phase<.5?'L':'R',local=phase% .5*2;
 let open=step?Math.sin(local*Math.PI)**2:0,depth=0,flight=0;
 if(squat){
  open=phase<.15?ease(phase/.15):phase<.55?1:1-ease((phase-.55)/.15);
  depth=phase<.15?0:phase<.35?ease((phase-.15)/.2):1-ease((phase-.35)/.2);
  flight=phase<.15?.85*Math.sin(phase/.15*Math.PI)**2:phase>=.55&&phase<.7?.85*Math.sin((phase-.55)/.15*Math.PI)**2:0;
 }
 byName.root.position.y+=step?-.65:squat?-.3-2.9*depth+flight:.12+.95*Math.sin(theta)**2;
 byName.root.position.z-=squat?.7*depth:0;
 if(step)byName.root.position.x+=(half==='L'?-.35:.35)*open;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,t=(phase+(side==='R'?.5:0))%1,raise=Math.max(0,Math.sin(t*2*Math.PI))**2;
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  if(step||squat){
   mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3());
   const travel=step?(side===half?2.8*open:0):2.4*open;
   const up=step?(side===half?.55*Math.sin(local*2*Math.PI)**2:0):flight;
   const foot=new THREE.Vector3(sign*(1.15+travel),-7.15+up,.2),axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
   if(d>=u.length()+l.length())throw Error('Unreachable ankle');
   const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(sign*.15*open,0,1);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));
   aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  }else{
   const a=rad(90*raise),k=rad(5+90*raise);
   aim('upperleg01.'+side,new THREE.Vector3(0,-Math.cos(a),Math.sin(a)),u);
   aim('lowerleg01.'+side,new THREE.Vector3(0,-Math.cos(a-k),Math.sin(a-k)),l);
  }
  mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
  if(step){
   const a=rad(12+150*open);
   aim('upperarm01.'+side,new THREE.Vector3(sign*Math.sin(a),-Math.cos(a),.04),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*Math.sin(a+.09),-Math.cos(a+.09),.06),rest('lowerarm01.'+side,'wrist.'+side));
  }else{
   const a=squat?.6:-rad(32)*Math.sin(t*2*Math.PI);
   aim('upperarm01.'+side,new THREE.Vector3(sign*.18,-Math.cos(a),Math.sin(a)),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*.04,Math.sin(a),Math.cos(a)),rest('lowerarm01.'+side,'wrist.'+side));
  }
  byName['wrist.'+side].quaternion.identity();
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(step?10:[0,30,42,28][joint])));
 }
}
