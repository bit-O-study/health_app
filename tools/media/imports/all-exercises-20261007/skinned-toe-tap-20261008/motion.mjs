import * as THREE from './three.module.js';
export const exercises=['toe-tap'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
let footVertices;
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const sec=(((frame%480)+480)%480)/60,local=sec%4,progress=local<.2?0:local<1.9?smooth((local-.2)/1.7):local<2.1?1:local<3.8?1-smooth((local-2.1)/1.7):0;
 byName.root.position.y-=3.6;
 if(!footVertices){footVertices={L:[],R:[]};for(let i=0;i<mesh.geometry.attributes.position.count;i++){const a=mesh.geometry.attributes.position;if(a.getY(i)< -7.5)footVertices[a.getX(i)>0?'L':'R'].push(i);}}
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,active=side===(sec<4?'L':'R'),a=active?progress:0,rest=(x,y)=>v(dataByName[y+'.'+side].head).sub(v(dataByName[x+'.'+side].head)),upper=rest('upperleg01','lowerleg01'),lower=rest('lowerleg01','foot');
 const direction=new THREE.Vector3(sign*.35,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
 for(let n=2;n<=5;n++)byName['toe'+n+'-1.'+side].rotation.x=rad(6)*(1-a);
 const target=new THREE.Vector3(sign*1.52462152,-7.03386876,4.2314152+2*a),desiredFloor=-7.751375+.55*Math.sin(Math.PI*a),footWorld=q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(25)*a);
 for(let iteration=0;iteration<3;iteration++){
 mesh.updateMatrixWorld(true);const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),axis=target.clone().sub(hip),d=axis.length(),u=upper.length(),l=lower.length();axis.normalize();const along=(u*u-l*l+d*d)/(2*d),out=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=hip.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,u*u-along*along)));
 aim('upperleg01.'+side,upper,knee.clone().sub(hip));aim('lowerleg01.'+side,lower,target.clone().sub(knee));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(footWorld));mesh.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;for(const i of footVertices[side]){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p);min=Math.min(min,p.y);}target.y+=desiredFloor-min;
 }
 }
}
