import * as THREE from './three.module.js';
export const exercises=['lying-leg-raise'];const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion();
export function applyMotion(id,lift,{byName,dataByName,mesh,shorts},frame=0){
const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head)),world=(n,w)=>{mesh.updateMatrixWorld(true);byName[n].quaternion.copy(byName[n].parent.getWorldQuaternion(q()).invert().multiply(w));},aim=(n,r,d)=>world(n,q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize()));
byName.root.quaternion.setFromAxisAngle(v([1,0,0]),-Math.PI/2);byName.root.position.set(0,-6.15,0);byName.spine01.position.z-=.12;
const t=frame/60,smooth=t=>t*t*t*(t*(t*6-15)+10),down=t<3.5?smooth(t/3.5):t<4.5?1:1-smooth((t-4.5)/3.5),angle=(90-75*down)*Math.PI/180;for(const side of ['L','R']){const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
aim(hip,rest(hip,knee),v([0,Math.sin(angle),Math.cos(angle)]));aim(knee,rest(knee,foot),v([0,Math.sin(angle),Math.cos(angle)]));world(foot,q().setFromAxisAngle(v([1,0,0]),-angle));
const dir=v([sign*.5,-.1,1]);aim(upper,rest(upper,elbow),dir);aim(elbow,rest(elbow,wrist),dir);
const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};world(wrist,q().setFromRotationMatrix(basis(v([0,0,1]),v([-sign,0,0])).multiply(basis(palm,across).invert())));
}
mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const target of [mesh,shorts]){const a=target.geometry.attributes.position;for(let i=0;i<a.count;i++)min=Math.min(min,target.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(a,i)).y);}byName.root.position.y+=-7.9+.015-min;
}
