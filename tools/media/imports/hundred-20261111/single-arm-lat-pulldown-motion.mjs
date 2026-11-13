import * as THREE from './three.module.js';
export const exercises=["single-arm-lat-pulldown"];
const config={"family":"pulldown","anchor":[0,13,4],"equipment":"cable","single":true},v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}

export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,l=(1-Math.cos(2*Math.PI*t))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 byName.root.position.y+=.32;const grips=[];
 for(const side of ['L','R']){const sign=side==='L'?1:-1,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side,active=!config.single||side==='L';let a,b;
 if(!active){a=v([sign*.2,-1,0]);b=v([sign*.15,-1,.1]);}
 else if(config.family==='row'||config.family==='press'){const f=config.family==='press'?1-l:l;a=v([sign*(.08+.35*f),-.85*f,1-1.35*f]);b=v([0,.05,1]);}
 else if(config.family==='overhead'||config.family==='pulldown'){const f=config.family==='overhead'?l:1-l,angle=rad(65+105*f);a=v([sign*Math.sin(angle),-Math.cos(angle),.15]);b=v([sign*.05,1,.12]);}
 else if(config.family==='face'){a=v([sign*(.15+.85*l),-.1,1-.9*l]);b=v([-sign*.1,.15+.85*l,1-.9*l]);}
 else {const f=config.family==='straight'?1-l:l,angle=rad(8+(config.family==='straight'?132:82)*f);a=config.family==='lateral'?v([sign*Math.sin(angle),-Math.cos(angle),.1]):v([sign*.08,-Math.cos(angle),Math.sin(angle)]);b=a.clone().applyAxisAngle(v([1,0,0]),rad(-8));}
 aim(upper,rest(upper,elbow),a);aim(elbow,rest(elbow,wrist),b);
   const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)).normalize(),across=index.clone().sub(little).normalize(),forward=rest('finger3-1.'+side,'finger3-2.'+side).normalize(),inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(-sign);
  const socket=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18).sub(v(dataByName[wrist].head));

 const direction=b.clone().normalize(),handleAxis=config.family==='row'||config.family==='face'?v([0,1,0]):v([-sign,0,0]);
 const world=q().setFromRotationMatrix(orientation(direction,handleAxis).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
   for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName[`finger${f}-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,65,80,50][j]));
  const thumb=dataByName['finger1-1.'+side];byName['finger1-1.'+side].quaternion.setFromUnitVectors(v(thumb.tail).sub(v(thumb.head)).normalize(),index.clone().addScaledVector(inward,.24).sub(v(thumb.head)).normalize());for(let j=2;j<=3;j++)byName[`finger1-${j}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*(j===2?55:45)));

 if(active)grips.push({side,socket,grip:pos(wrist).add(socket.clone().applyQuaternion(world)),handleAxis});
 }return grips;
}
