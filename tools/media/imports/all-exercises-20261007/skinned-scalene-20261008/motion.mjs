import * as THREE from './three.module.js';
export const exercises=['scalene-neck-stretch'];
const v=a=>new THREE.Vector3().fromArray(a),q=()=>new THREE.Quaternion(),smooth=t=>t*t*t*(t*(t*6-15)+10),rad=THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const sec=(((frame%480)+480)%480)/60,amount=sec<2?smooth(sec/2):sec<5?1:sec<7?1-smooth((sec-5)/2):0;
 byName.root.position.y-=3.6;
 const tilt=sec<1?smooth(sec):sec<6?1:sec<7?1-smooth(sec-6):0,turn=sec<1?0:sec<2?smooth(sec-1):sec<5?1:sec<6?1-smooth(sec-5):0;const desired=q().setFromEuler(new THREE.Euler(0,rad(18)*turn,rad(12)*tilt,'ZYX'));
 for(const [name,share]of [['neck01',.3],['neck02',.3],['neck03',.25],['head',.15]])byName[name].quaternion.copy(q().slerp(desired,share));
 const aim=(name,rest,target)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(rest.clone().normalize(),target.clone().normalize())));};
 for(const side of ['L','R']){
 const sign=side==='L'?1:-1,rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
 aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
 const direction=new THREE.Vector3(sign*.35,-1,0);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),direction);aim('lowerarm01.'+side,rest('lowerarm01','wrist'),direction);byName['wrist.'+side].quaternion.identity();
 }
 const side='R',upper=v(dataByName['lowerarm01.R'].head).sub(v(dataByName['upperarm01.R'].head)),lower=v(dataByName['wrist.R'].head).sub(v(dataByName['lowerarm01.R'].head));mesh.updateMatrixWorld(true);const shoulder=byName['upperarm01.R'].getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(.4,6.1-3.6,1.8),axis=target.clone().sub(shoulder),d=axis.length(),a=upper.length(),b=lower.length();axis.normalize();const along=(a*a-b*b+d*d)/(2*d),out=new THREE.Vector3(-1,-.8,.9);out.addScaledVector(axis,-out.dot(axis)).normalize();const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(out,Math.sqrt(Math.max(0,a*a-along*along)));
 aim('upperarm01.R',upper,elbow.clone().sub(shoulder));aim('lowerarm01.R',lower,target.clone().sub(elbow));
 const index=v(dataByName['finger2-1.R'].head),little=v(dataByName['finger5-1.R'].head),across=index.clone().sub(little),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName['wrist.R'].head)),world=q().setFromRotationMatrix(basis(new THREE.Vector3(1,-.2,-.2),new THREE.Vector3(0,1,0)).multiply(basis(palm,across).invert()));mesh.updateMatrixWorld(true);byName['wrist.R'].quaternion.copy(byName['wrist.R'].parent.getWorldQuaternion(q()).invert().multiply(world));
}

