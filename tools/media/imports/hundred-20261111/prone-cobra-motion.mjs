import * as THREE from './three.module.js';
export const exercises=["prone-cobra"];const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad,smooth=t=>t*t*t*(t*(t*6-15)+10),floor=-7.751375;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){const sec=((frame%480)+480)%480/60,up=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));},rest=(a,b,side)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);byName.root.position.set(0,-6.2,0);
for(const side of ['L','R']){aim('upperleg01.'+side,rest('upperleg01','lowerleg01',side),new THREE.Vector3(0,-.18,-1));aim('lowerleg01.'+side,rest('lowerleg01','foot',side),new THREE.Vector3(0,-.083,-1));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(153))));}
for(const side of ['L','R'])for(let f=1;f<=5;f++)byName['toe'+f+'-1.'+side].quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(-2));
for(const [n,share]of [['spine05',.1],['spine04',.15],['spine03',.2],['spine02',.25],['spine01',.3]])byName[n].quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(-(2+18*up)*share));
mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;const pos=mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++){if(pos.getY(i)>1.3||pos.getY(i)<-2||Math.abs(pos.getX(i))>2.8)continue;const p=new THREE.Vector3().fromBufferAttribute(pos,i);mesh.applyBoneTransform(i,p);min=Math.min(min,p.y);}byName.root.position.y+=floor+.04-min;

for(const side of ['L','R']){const sign=side==='L'?1:-1,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side,direction=v([sign*.24,.04+.12*up,-1]).normalize();aim(upper,rest('upperarm01','lowerarm01',side),direction);aim(elbow,rest('lowerarm01','wrist',side),direction.clone().add(v([0,.08,0])));
const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little),basis=(a,b)=>{const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));};
const world=q().setFromRotationMatrix(basis(direction,v([0,1,0])).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
}
}
