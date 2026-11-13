import * as THREE from './three.module.js';
export const exercises=["lying-side-lateral-raise"];
const config={"family":"lateral","anchor":[-5,-7.7,0],"equipment":"cable","single":true},v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}

export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,l=(1-Math.cos(2*Math.PI*t))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};

 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}
 const turn=q().setFromAxisAngle(v([0,0,1]),rad(90));byName.root.quaternion.copy(turn);byName.root.position.set(0,-5.3,0);ik('upperleg01.L','lowerleg01.L','foot.L',pos('foot.R').add(v([-.3,.8,0])),v([0,0,1]));mesh.updateMatrixWorld(true);byName['foot.L'].quaternion.copy(byName['foot.L'].parent.getWorldQuaternion(q()).invert().multiply(turn));const grips=[];

 for(const side of ['L','R']){const sign=side==='L'?1:-1,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side,active=!config.single||side==='L';let a,b;
 if(!active){a=v([sign*.2,-1,0]);b=v([sign*.15,-1,.1]);}
 else if(config.family==='row'||config.family==='press'){const f=config.family==='press'?1-l:l;a=v([sign*(.08+.35*f),-.85*f,1-1.35*f]);b=v([0,.05,1]);}
 else if(config.family==='overhead'||config.family==='pulldown'){const f=config.family==='overhead'?l:1-l,angle=rad(65+105*f);a=v([sign*Math.sin(angle),-Math.cos(angle),.15]);b=v([sign*.05,1,.12]);}
 else if(config.family==='face'){a=v([sign*(.15+.85*l),-.1,1-.9*l]);b=v([-sign*.1,.15+.85*l,1-.9*l]);}
 else {const f=config.family==='straight'?1-l:l,angle=rad(8+(config.family==='straight'?132:82)*f);a=config.family==='lateral'?v([sign*Math.sin(angle),-Math.cos(angle),.1]):v([sign*.08,-Math.cos(angle),Math.sin(angle)]);b=a.clone().applyAxisAngle(v([1,0,0]),rad(-8));}
 if(active){a.applyQuaternion(turn);b.applyQuaternion(turn);aim(upper,rest(upper,elbow),a);aim(elbow,rest(elbow,wrist),b);}else{ik(upper,elbow,wrist,v([-7,-6.2,0]),v([0,-.3,1]));b=pos(wrist).sub(pos(elbow));}
   const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));

 const direction=b.clone().normalize(),handleAxis=v([0,0,1]),unusedAxis=config.family==='row'||config.family==='face'?v([0,1,0]):v([-sign,0,0]);
 const world=q().setFromRotationMatrix(orientation(direction,handleAxis).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
   for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));
  const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));

 if(active)grips.push({side,socket,grip:pos(wrist).add(socket.clone().applyQuaternion(world)),handleAxis});
 }mesh.updateMatrixWorld(true);mesh.skeleton.update();let minimum=Infinity;for(let i=0;i<mesh.geometry.attributes.position.count;i++)minimum=Math.min(minimum,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)).y);const shift=-7.86-minimum;byName.root.position.y+=shift;for(const g of grips)g.grip.y+=shift;return grips;
}
