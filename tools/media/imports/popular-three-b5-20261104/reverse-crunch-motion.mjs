import * as THREE from './three.module.js';
export const exercises=['dead-bug','reverse-crunch'];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));};
 const aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
 const t=((frame%480)+480)%480/480,a=(1-Math.cos(4*Math.PI*t))/2,legSide=t<.5?'R':'L',armSide=t<.5?'L':'R';
 byName.root.rotation.x=-Math.PI/2;byName.root.position.y=-6.15;
 if(id==='reverse-crunch'){
  const anchor=pos('spine01');byName.root.rotation.x-=rad(24*lift);byName.root.position.add(anchor.sub(pos('spine01')));
  world('spine01',q().setFromAxisAngle(v([1,0,0]),-Math.PI/2));
 }
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
  const leg=id==='dead-bug'?(side===legSide?a:0):lift;
  const th=rad(id==='dead-bug'?75*leg:-20*leg),shin=rad(id==='dead-bug'?-12*leg:20*leg);
  aim(hip,rest(hip,knee),v([0,Math.cos(th),Math.sin(th)]));aim(knee,rest(knee,foot),v([0,Math.sin(shin),Math.cos(shin)]));
  world(foot,q().setFromAxisAngle(v([1,0,0]),rad(-70+shin*180/Math.PI)));
  const arm=id==='dead-bug'?(side===armSide?a:0):0,at=rad(80*arm);
  const dir=id==='dead-bug'?v([sign*.04,Math.cos(at),-Math.sin(at)]):v([sign*.12,-.06,1]);
  aim(upper,rest(upper,elbow),dir);aim(elbow,rest(elbow,wrist),id==='dead-bug'?v([sign*.04,Math.cos(at+rad(7)),-Math.sin(at+rad(7))]):v([0,-.10,1]));
  const palm=rest(wrist,'finger3-1.'+side),across=rest('finger5-1.'+side,'finger2-1.'+side);
  const f=id==='dead-bug'?v([0,Math.cos(at+rad(7)),-Math.sin(at+rad(7))]):v([0,0,1]),ax=v([id==='reverse-crunch'?-sign:sign,0,0]);
  const basis=(x,y)=>{x=x.clone().normalize();y=y.clone().addScaledVector(x,-y.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};
  world(wrist,q().setFromRotationMatrix(basis(f,ax).multiply(basis(palm,across).invert())));
 }
}
