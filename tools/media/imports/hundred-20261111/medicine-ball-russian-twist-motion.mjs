import * as THREE from './three.module.js';
export const exercises=["medicine-ball-russian-twist"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}


 const t=(((frame%480)+480)%480)/480,twist=rad(32)*Math.sin(2*Math.PI*t),turn=q().setFromAxisAngle(v([1,0,0]),rad(-25)),rotate=q().setFromAxisAngle(v([0,1,0]),twist);byName.root.quaternion.copy(turn);byName.root.position.set(0,-6.55,0);for(const n of ['spine05','spine04','spine03','spine02','spine01'])byName[n].rotation.y=twist/5;
 const ball=byName.root.position.clone().add(v([0,2.8,4]).applyQuaternion(rotate).applyQuaternion(turn)),grips=[];
 for(const side of ['L','R']){const sign=side==='L'?1:-1;ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,v([sign*1.4,-7.15,6.5]),v([0,1,0]));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
 const wrist='wrist.'+side,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little).normalize(),direction=v([0,0,1]).applyQuaternion(rotate).applyQuaternion(turn),axis=v([0,sign,0]).applyQuaternion(rotate).applyQuaternion(turn),world=q().setFromRotationMatrix(orientation(direction,axis).multiply(orientation(palm,across).invert())),surface=ball.clone().add(v([sign*1.8,0,-.15]).applyQuaternion(rotate).applyQuaternion(turn)),target=surface.clone().sub(palm.clone().applyQuaternion(world));ik('upperarm01.'+side,'lowerarm01.'+side,wrist,target,v([sign,-1,0]));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName['finger'+f+'-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*[0,10,15,15][j]));grips.push({side,palm,surface});
 }return {ball,grips};
}
