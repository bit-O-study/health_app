import * as THREE from './three.module.js';
export const exercises=['pause-front-squat'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=((frame%480)+480)%480/480,chair=id==='chair-pose';
 const depth=lift;
 byName.root.position.y+=.32-(chair?2.5:5.15)*depth;
 byName.root.position.z-=1.4*depth;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const aim=(name,dir,r)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),dir.clone().normalize())));};
 // Lean the pelvis and trunk together, then solve planted ankles in world space.
 byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(10*depth));
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

  { // Solve wrists in trunk space; fixed rack/cup position follows the torso.
  const rootQ=byName.root.getWorldQuaternion(q()),rootP=byName.root.getWorldPosition(new THREE.Vector3());
  const world=p=>p.sub(v(dataByName.root.head)).applyQuaternion(rootQ).add(rootP);
  const target=world(new THREE.Vector3(sign*3.3,5.5,.1));
  const upper=rest('upperarm01.'+side,'lowerarm01.'+side),lower=rest('lowerarm01.'+side,'wrist.'+side);
  mesh.updateMatrixWorld(true);const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),axis=target.clone().sub(shoulder),distance=axis.length();axis.normalize();
  if(distance>=upper.length()+lower.length()||distance<=Math.abs(upper.length()-lower.length()))throw Error('Unreachable rack');
  const along=(upper.lengthSq()-lower.lengthSq()+distance*distance)/(2*distance),pole=new THREE.Vector3(0,0,1).applyQuaternion(rootQ);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(upper.lengthSq()-along*along));
  aim('upperarm01.'+side,elbow.clone().sub(shoulder),upper);aim('lowerarm01.'+side,target.clone().sub(elbow),lower);
  const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
  mesh.updateMatrixWorld(true);
  const wrist=byName['wrist.'+side];
  const forward=v(dataByName['finger3-1.'+side].tail).sub(v(dataByName['finger3-1.'+side].head)).normalize();
  const basis=(x,y)=>{x=x.clone().normalize();y=y.clone().addScaledVector(x,-y.dot(x)).normalize();return q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y)));};
  const desired=basis(new THREE.Vector3(-sign,0,0),new THREE.Vector3(0,.3,1));
  const orientation=rootQ.clone().multiply(desired).multiply(basis(across,forward).invert());
  wrist.quaternion.copy(wrist.parent.getWorldQuaternion(q()).invert().multiply(orientation));
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*25));
 }
 }
}
