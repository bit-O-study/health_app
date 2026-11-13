import * as THREE from './three.module.js';
export const exercises=["band-monster-walk"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}


 const t=(((frame%480)+480)%480)/120,step=Math.floor(t),u=t-step,ease=u*u*u*(u*(u*6-15)+10),feet={L:v([2,-7.15,0]),R:v([-2,-7.15,0])};
 if(step>0)feet.L.set(3,-7.15,3);if(step>1)feet.R.set(-3,-7.15,3);if(step>2)feet.L.set(2,-7.15,0);
 const side=step%2?'R':'L',sign=side==='L'?1:-1,target=step<2?v([sign*3,-7.15,3]):v([sign*2,-7.15,0]);feet[side].lerp(target,ease);feet[side].y+=.7*Math.sin(Math.PI*u)**2;
 byName.root.position.y-=2;byName.root.position.z=(feet.L.z+feet.R.z)/2-.6;byName.root.position.x=(feet.L.x+feet.R.x)/2;byName.root.quaternion.setFromAxisAngle(v([1,0,0]),rad(12));
 for(const side of ['L','R']){const sign=side==='L'?1:-1;ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,feet[side],v([sign*.25,0,1]));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());const shoulder=pos('upperarm01.'+side),wrist='wrist.'+side;ik('upperarm01.'+side,'lowerarm01.'+side,wrist,shoulder.clone().add(v([-sign*.4,-.7,2.4])),v([sign,-1,0]));const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little).normalize(),world=q().setFromRotationMatrix(orientation(v([0,0,1]),v([-sign,0,0])).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName['finger'+f+'-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*[0,35,40,30][j]));}
}
