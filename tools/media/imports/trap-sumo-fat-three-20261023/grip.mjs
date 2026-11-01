import * as THREE from './three.module.js';
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion();
function basis(a,b){const x=a.clone().normalize(),y=b.clone().addScaledVector(x,-b.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function placeGrip({byName,dataByName,mesh,dumbbells},trap){
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const states=['L','R'].map((side,i)=>{
  const sign=side==='L'?1:-1,index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head);
  const palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
  const across=trap?new THREE.Vector3(0,0,1):new THREE.Vector3(-sign,0,0);
  const rotation=q().setFromRotationMatrix(basis(across,new THREE.Vector3(0,-1,0)).multiply(basis(index.sub(little),palm).invert()));
  const offset=dumbbells[i].position.clone().applyQuaternion(rotation);
  mesh.updateMatrixWorld(true);
  const shoulder=byName['upperarm01.'+side].getWorldPosition(new THREE.Vector3()),a=rest('upperarm01.'+side,'lowerarm01.'+side),b=rest('lowerarm01.'+side,'wrist.'+side);
  const x=sign*(trap?3:.65),z=trap?.2:1.5;
  const reach=a.lengthSq()+b.lengthSq()-2*a.length()*b.length()*Math.cos(THREE.MathUtils.degToRad(175));
  const vertical=Math.sqrt(reach-(x-offset.x-shoulder.x)**2-(z-offset.z-shoulder.z)**2);
  if(!Number.isFinite(vertical))throw Error('Unreachable grip');
  return {side,sign,rotation,offset,shoulder,a,b,x,z,y:shoulder.y-vertical+offset.y};
 });
 const y=Math.max(...states.map(s=>s.y));
 const aim=(name,direction,original)=>{mesh.updateMatrixWorld(true);const bone=byName[name];bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(original.clone().normalize(),direction.clone().normalize())));};
 for(const s of states){
  const target=new THREE.Vector3(s.x,y,s.z).sub(s.offset),axis=target.clone().sub(s.shoulder),d=axis.length();axis.normalize();
  const along=(s.a.lengthSq()-s.b.lengthSq()+d*d)/(2*d),pole=new THREE.Vector3(s.sign*.3,-1,0);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  const elbow=s.shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(s.a.lengthSq()-along*along));
  aim('upperarm01.'+s.side,elbow.clone().sub(s.shoulder),s.a);aim('lowerarm01.'+s.side,target.clone().sub(elbow),s.b);
  mesh.updateMatrixWorld(true);const wrist=byName['wrist.'+s.side];wrist.quaternion.copy(wrist.parent.getWorldQuaternion(q()).invert().multiply(s.rotation));
 }
}
