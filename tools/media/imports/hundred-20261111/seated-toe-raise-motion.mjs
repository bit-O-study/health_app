import * as THREE from './three.module.js';
export const exercises=["seated-toe-raise"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}

 byName.root.position.y-=3;const heels=[];
 for(const side of ['L','R']){const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side;
 aim(hip,rest(hip,knee),v([sign*.05,0,1]));aim(knee,rest(knee,foot),v([0,-1,0]));
 const offset=v([0,-.65,-.35]),heel=pos(foot).add(offset),rot=q().setFromAxisAngle(v([1,0,0]),rad(-25*phase));
 ik(hip,knee,foot,heel.clone().sub(offset.clone().applyQuaternion(rot)),v([0,0,1]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert().multiply(rot));heels.push(heel);
 const upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
 aim(upper,rest(upper,elbow),v([sign*.15,-1,.2]));aim(elbow,rest(elbow,wrist),v([0,-.15,1]));
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little);
 const world=q().setFromRotationMatrix(orientation(v([0,-.15,1]),v([-sign,0,0])).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
 }return heels;
}
