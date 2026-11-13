import * as THREE from './three.module.js';
export const exercises=["clamshell"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}


 const turn=q().setFromAxisAngle(v([0,0,1]),rad(90));byName.root.quaternion.copy(turn);byName.root.position.set(0,-5.3,0);
 for(const side of ['L','R']){const active=side==='L',a=rad(active?45*phase:0);ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,v([5,active?-5.6:-6.4,0]),v([0,Math.sin(a),Math.cos(a)]));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(turn));
 const wrist='wrist.'+side;ik('upperarm01.'+side,'lowerarm01.'+side,wrist,active?v([-.7,-2.7,1]):v([-7,-6.2,0]),active?v([0,0,1]):v([0,-.3,1]));
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),world=q().setFromRotationMatrix(orientation(active?v([1,0,0]):v([-1,0,0]),v([0,0,1])).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
 }mesh.updateMatrixWorld(true);mesh.skeleton.update();let minimum=Infinity;for(let i=0;i<mesh.geometry.attributes.position.count;i++)minimum=Math.min(minimum,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)).y);byName.root.position.y+=-7.86-minimum;
}
