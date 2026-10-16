import * as THREE from './three.module.js';
export const exercises = ['running'];
const v = a => new THREE.Vector3().fromArray(a);
const q = () => new THREE.Quaternion();
const rad = THREE.MathUtils.degToRad;

// One stride every 2/3 second: 180 alternating steps/minute, 12 strides/8s.
// Periodic Hermite ankle trajectory: stance, toe-off, recovery, landing.
const knots = [
  [0, -7.12, .65, 0, -8],
  [.38, -7.12, -2.39, 0, -8],
  [.60, -3.3, -3.5, 0, 4],
  [.80, -4.9, 1.35, -17, 16],
  [1, -7.12, .65, 0, -8],
];
function ankle(t) {
  let i=0; while(t>knots[i+1][0]) i++;
  const a=knots[i], b=knots[i+1], d=b[0]-a[0], u=(t-a[0])/d;
  const h=[2*u**3-3*u**2+1,u**3-2*u**2+u,-2*u**3+3*u**2,u**3-u**2];
  return [1,2].map(k=>h[0]*a[k]+h[1]*d*a[k+2]+h[2]*b[k]+h[3]*d*b[k+2]);
}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame) {
  const phase=((frame%40)+40)%40/40;
  const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
  const aim=(name,direction,restDirection)=>{
    mesh.updateMatrixWorld(true);
    const world=q().setFromUnitVectors(restDirection.clone().normalize(),direction.clone().normalize());
    byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(world));
  };
  byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(5));
  byName.root.position.y += -.35 + .22*Math.cos(phase*4*Math.PI);
  for(const side of ['L','R']) {
    const t=(phase+(side==='R'?.5:0))%1, sign=side==='L'?1:-1;
    mesh.updateMatrixWorld(true);
    const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3());
    const [y,z]=ankle(t), foot=new THREE.Vector3(sign*1.20,y,z);
    const upper=rest('upperleg01.'+side,'lowerleg01.'+side),lower=rest('lowerleg01.'+side,'foot.'+side);
    const axis=foot.clone().sub(hip),d=axis.length(); axis.normalize();
    const along=(upper.lengthSq()-lower.lengthSq()+d*d)/(2*d);
    const pole=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
    const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper.lengthSq()-along*along)));
    aim('upperleg01.'+side,knee.clone().sub(hip),upper);
    aim('lowerleg01.'+side,foot.clone().sub(knee),lower);
    mesh.updateMatrixWorld(true);
    const pitch=rad(t<.38? 8*Math.sin(t/.38*Math.PI) : -25*Math.sin((t-.38)/.62*Math.PI));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),pitch)));
    // Shoulder swing opposes this side's leg; elbow stays gently bent near 90°.
    const a=rad(28)*Math.sin(t*2*Math.PI-.6);
    aim('upperarm01.'+side,new THREE.Vector3(sign*.18,-Math.cos(a),Math.sin(a)),rest('upperarm01.'+side,'lowerarm01.'+side));
    aim('lowerarm01.'+side,new THREE.Vector3(sign*.04,Math.sin(a),Math.cos(a)),rest('lowerarm01.'+side,'wrist.'+side));
    // Align wrist to forearm instead of retaining the source exercise's hand pose.
    byName['wrist.'+side].quaternion.identity();
    const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
    for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++) {
      byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,30,42,28][joint]));
    }
  }
}
