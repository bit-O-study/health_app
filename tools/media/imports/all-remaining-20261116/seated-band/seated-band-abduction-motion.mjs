import * as THREE from './three.module.js';
export const exercises=['seated-band-abduction'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame=0){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));},world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 const t=frame/60,smooth=t=>t*t*t*(t*(t*6-15)+10),up=t<3.5?smooth(t/3.5):t<4.5?1:1-smooth((t-4.5)/3.5);
 byName.root.position.y-=3.6;
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side;
  aim(hip,rest(hip,knee),v([sign*.1,-.05,1]));aim(knee,rest(knee,foot),v([0,-1,0]));
  const target=pos(foot),axis=target.clone().sub(pos(hip)).normalize(),pole=pos(knee).sub(pos(hip));pole.addScaledVector(axis,-pole.dot(axis)).normalize().applyAxisAngle(axis,rad(-sign*30*up));ik(hip,knee,foot,target,pole);world(foot,q());
  const arm='upperarm01.'+side,fore='lowerarm01.'+side,wrist='wrist.'+side,d=v([sign*.35,-1,0]);aim(arm,rest(arm,fore),d);aim(fore,rest(fore,wrist),d);byName[wrist].quaternion.identity();
 }
}
