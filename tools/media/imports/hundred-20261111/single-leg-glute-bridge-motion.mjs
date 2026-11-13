import * as THREE from './three.module.js';
export const exercises=["single-leg-glute-bridge"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}

 const neckRest=v(dataByName.neck01.head),neckTarget=v([0,-6.7,-5]),flat=q().setFromAxisAngle(v([1,0,0]),rad(-90));
 const place=turn=>{byName.root.quaternion.copy(turn);byName.root.position.copy(neckTarget.clone().sub(neckRest.clone().sub(v(dataByName.root.head)).applyQuaternion(turn)));mesh.updateMatrixWorld(true);byName.neck01.quaternion.copy(byName.neck01.parent.getWorldQuaternion(q()).invert().multiply(flat));mesh.updateMatrixWorld(true);mesh.skeleton.update();};
 place(flat);let min=Infinity;const attr=mesh.geometry.attributes.position;for(let i=0;i<attr.count;i++){if(attr.getY(i)<2||Math.abs(attr.getX(i))>2)continue;min=Math.min(min,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(attr,i)).y);}const shift=-7.85-min;
 place(q().setFromAxisAngle(v([1,0,0]),rad(-92-28*phase)));byName.root.position.y+=shift;
 ik('upperleg01.L','lowerleg01.L','foot.L',v([1.6,-7.15,5.4]),v([0,1,1]));mesh.updateMatrixWorld(true);byName['foot.L'].quaternion.copy(byName['foot.L'].parent.getWorldQuaternion(q()).invert());
 aim('upperleg01.R',rest('upperleg01.R','lowerleg01.R'),v([0,1,.4]));aim('lowerleg01.R',rest('lowerleg01.R','foot.R'),v([0,0,1]));mesh.updateMatrixWorld(true);byName['foot.R'].quaternion.copy(byName['foot.R'].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([1,0,0]),rad(-60))));
 for(const side of ['L','R']){const sign=side==='L'?1:-1,wrist='wrist.'+side;ik('upperarm01.'+side,'lowerarm01.'+side,wrist,v([sign*3,-7.22,-.6]),v([sign,0,0]));const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),world=q().setFromRotationMatrix(orientation(v([0,0,1]),v([-sign,0,0])).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));}
}
