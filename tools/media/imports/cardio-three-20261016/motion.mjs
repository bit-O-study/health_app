import * as THREE from './three.module.js';
export const exercises=['high-knees','butt-kicks','jumping-jack'];
const vec=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=((frame%120)+120)%120/120,theta=phase*2*Math.PI;
 const rest=(a,b)=>vec(dataByName[b].head).sub(vec(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 const jack=id==='jumping-jack',open=.5-.5*Math.cos(theta);
 byName.root.position.y+=jack?-.3+.5*Math.sin(theta)**2:.12+.28*Math.sin(theta*2)**2;
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,t=(phase+(side==='R'?.5:0))%1;
  const raise=Math.max(0,Math.sin(t*2*Math.PI))**2;
  const u=rest('upperleg01.'+side,'lowerleg01.'+side),l=rest('lowerleg01.'+side,'foot.'+side);
  if(jack){
   mesh.updateMatrixWorld(true);
   const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3());
   const foot=new THREE.Vector3(sign*(1.15+2.4*open),-7.15+.5*Math.sin(theta)**2,.2);
   const axis=foot.clone().sub(hip),d=axis.length();axis.normalize();
   const a=(u.lengthSq()-l.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
   const knee=hip.clone().addScaledVector(axis,a).addScaledVector(pole,Math.sqrt(Math.max(0,u.lengthSq()-a*a)));
   aim('upperleg01.'+side,knee.clone().sub(hip),u);aim('lowerleg01.'+side,foot.clone().sub(knee),l);
  }else{
   const hipAngle=rad(id==='high-knees'?90*raise:0),kneeAngle=rad(id==='high-knees'?90*raise:135*raise);
   aim('upperleg01.'+side,new THREE.Vector3(0,-Math.cos(hipAngle),Math.sin(hipAngle)),u);
   aim('lowerleg01.'+side,new THREE.Vector3(0,-Math.cos(hipAngle-kneeAngle),Math.sin(hipAngle-kneeAngle)),l);
  }
  mesh.updateMatrixWorld(true);
  const footAngle=id==='butt-kicks'?rad(135*raise):0;
  byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),footAngle)));
  if(jack){
   const a=rad(12+150*open);
   aim('upperarm01.'+side,new THREE.Vector3(sign*Math.sin(a),-Math.cos(a),.04),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*Math.sin(a+.09),-Math.cos(a+.09),.06),rest('lowerarm01.'+side,'wrist.'+side));
  }else{
   const a=-rad(32)*Math.sin(t*2*Math.PI);
   aim('upperarm01.'+side,new THREE.Vector3(sign*.18,-Math.cos(a),Math.sin(a)),rest('upperarm01.'+side,'lowerarm01.'+side));
   aim('lowerarm01.'+side,new THREE.Vector3(sign*.04,Math.sin(a),Math.cos(a)),rest('lowerarm01.'+side,'wrist.'+side));
  }
  byName['wrist.'+side].quaternion.identity();
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(jack?10:[0,30,42,28][joint])));
 }
}
