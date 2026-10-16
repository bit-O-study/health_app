import * as THREE from './three.module.js';
export const exercises=['hip-circle'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
const phase=(((frame%480)+480)%480)/480*Math.PI*2,dx=.55*Math.sin(phase),dz=.45*Math.cos(phase);byName.root.position.y+=.25;byName.root.position.x+=dx;byName.root.position.z+=dz;for(const n of ['spine05','spine04','spine03','spine02','spine01']){byName[n].rotation.z=dx/5/6;byName[n].rotation.x=-dz/5/6;}
const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
for(const side of ['L','R']){
const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head)),direction=new THREE.Vector3(sign*.25,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();

mesh.updateMatrixWorld(true);const upper=rest('upperleg01','lowerleg01'),lower=rest('lowerleg01','foot'),hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(sign*1.5,-7.033869020080567,.18915),axis=target.clone().sub(hip),d=axis.length(),u=upper.length(),l=lower.length();axis.normalize();const along=(u*u-l*l+d*d)/(2*d),out=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),knee=hip.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,u*u-along*along)));aim('upperleg01.'+side,upper,knee.clone().sub(hip));aim('lowerleg01.'+side,lower,target.clone().sub(knee));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
}
}

