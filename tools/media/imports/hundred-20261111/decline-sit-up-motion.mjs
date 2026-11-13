import * as THREE from './three.module.js';
export const exercises = ["decline-sit-up"];
const v = a => new THREE.Vector3().fromArray(a);
const rad = THREE.MathUtils.degToRad;
const xAxis = new THREE.Vector3(1,0,0);
function orientation(forward, across) {
  const x = forward.clone().normalize();
  const y = across.clone().addScaledVector(x,-across.dot(x)).normalize();
  return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));
}
export function applyMotion(id, lift, {byName,dataByName,mesh},frame) {
 lift=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;const grips=[];
  if(!exercises.includes(id))throw new Error('Unknown exercise: '+id);
  const aim = (name, rest, direction) => {
    const bone=byName[name]; mesh.updateMatrixWorld(true);
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(new THREE.Quaternion().setFromUnitVectors(rest.clone().normalize(),direction.clone().normalize())));
    mesh.updateMatrixWorld(true);
  };
  byName.root.position.y-=1.4; byName.spine05.rotation.x=-rad(120-90*lift);
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const rest=(a,b)=>v(dataByName[b+'.'+side].head).sub(v(dataByName[a+'.'+side].head));
    aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.10,-.05,1));
    aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-1,0));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert());

    const angle=-rad(120-90*lift),rot=new THREE.Quaternion().setFromAxisAngle(xAxis,angle);aim('upperarm01.'+side,rest('upperarm01','lowerarm01'),new THREE.Vector3(sign*.6,-1,.3).applyQuaternion(rot));aim('lowerarm01.'+side,rest('lowerarm01','wrist'),new THREE.Vector3(-sign*.8,.7,.3).applyQuaternion(rot));
    const across=rest('finger5-1','finger2-1').normalize();for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName['finger'+f+'-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*15));
  }return grips;
}
