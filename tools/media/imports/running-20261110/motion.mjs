import * as THREE from './three.module.js';
export const exercises = ['running'];
const v = a => new THREE.Vector3().fromArray(a);
const q = () => new THREE.Quaternion();
const rad = THREE.MathUtils.degToRad;
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}

// Ten strides in eight seconds (150 alternating steps/minute), illustrative jogging pace.
// C1 periodic trajectory: flat support, toe-off, heel recovery, forward swing, landing.
const knots=[
 [0,-7.12,1.15,0,-9],
 [.34,-7.12,-1.91,0,-9],
 [.46,-6.2,-2.8,10,-3],
 [.62,-3.5,-2.2,0,9],
 [.82,-4.9,1.3,-14,8],
 [1,-7.12,1.15,0,-9],
];
const smooth=t=>t*t*t*(t*(t*6-15)+10);
function ankle(t) {
  let i=0; while(t>knots[i+1][0]) i++;
  const a=knots[i], b=knots[i+1], d=b[0]-a[0], u=(t-a[0])/d;
  const h=[2*u**3-3*u**2+1,u**3-2*u**2+u,-2*u**3+3*u**2,u**3-u**2];
  return [1,2].map(k=>h[0]*a[k]+h[1]*d*a[k+2]+h[2]*b[k]+h[3]*d*b[k+2]);
}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame) {
  const phase=((frame%48)+48)%48/48;
  const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
  const aim=(name,direction,restDirection)=>{
    mesh.updateMatrixWorld(true);
    const world=q().setFromUnitVectors(restDirection.clone().normalize(),direction.clone().normalize());
    byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(world));
  };
  byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(5));
  byName.spine05.rotation.y=rad(2)*Math.sin(phase*2*Math.PI);
  byName.root.position.y += -.15 + .20*Math.cos((phase-.44)*4*Math.PI);
  for(const side of ['L','R']) {
    const t=(phase+(side==='R'?.5:0))%1, sign=side==='L'?1:-1;
    mesh.updateMatrixWorld(true);
    const hip=byName['upperleg01.'+side].getWorldPosition(new THREE.Vector3());
    const [y,z]=ankle(t), foot=new THREE.Vector3(sign*.95,y,z);
    const upper=rest('upperleg01.'+side,'lowerleg01.'+side),lower=rest('lowerleg01.'+side,'foot.'+side);
    const axis=foot.clone().sub(hip),d=axis.length(); axis.normalize();
    if(d>=upper.length()+lower.length()||d<=Math.abs(upper.length()-lower.length()))throw Error('Unreachable ankle '+frame+' '+side);
    const along=(upper.lengthSq()-lower.lengthSq()+d*d)/(2*d);
    const pole=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
    const knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper.lengthSq()-along*along)));
    aim('upperleg01.'+side,knee.clone().sub(hip),upper);
    aim('lowerleg01.'+side,foot.clone().sub(knee),lower);
    mesh.updateMatrixWorld(true);
    const pitch=rad(t<.34?0:t<.46?25*smooth((t-.34)/.12):t<.66?25*(1-smooth((t-.46)/.20)):t<.82?-8*smooth((t-.66)/.16):-8*(1-smooth((t-.82)/.18)));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),pitch)));
    // Shoulder swing opposes this side's leg; elbow stays gently bent near 90°.
    const a=-rad(30)*Math.cos((t-.02)*2*Math.PI);
    const elbow=rad(5)*Math.sin(t*2*Math.PI);
    aim('upperarm01.'+side,new THREE.Vector3(sign*.10,-Math.cos(a),Math.sin(a)),rest('upperarm01.'+side,'lowerarm01.'+side));
    aim('lowerarm01.'+side,new THREE.Vector3(sign*.04,Math.sin(a+elbow),Math.cos(a+elbow)),rest('lowerarm01.'+side,'wrist.'+side));
    // Align wrist to forearm instead of retaining the source exercise's hand pose.
    const palm=v(dataByName['finger2-1.'+side].head).add(v(dataByName['finger5-1.'+side].head)).multiplyScalar(.5).sub(v(dataByName['wrist.'+side].head));
    const lateral=rest('finger5-1.'+side,'finger2-1.'+side);
    const world=q().setFromRotationMatrix(basis(new THREE.Vector3(sign*.04,Math.sin(a+elbow),Math.cos(a+elbow)),new THREE.Vector3(0,1,0)).multiply(basis(palm,lateral).invert()));
    mesh.updateMatrixWorld(true);byName['wrist.'+side].quaternion.copy(byName['wrist.'+side].parent.getWorldQuaternion(q()).invert().multiply(world));
    const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();
    for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++) {
      byName[`finger${finger}-${joint}.${side}`].quaternion.setFromAxisAngle(across,rad(-sign*[0,60,70,45][joint]));
    }
  }
}
