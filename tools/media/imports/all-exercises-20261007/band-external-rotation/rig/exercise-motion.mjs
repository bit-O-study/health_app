import * as T from './three.module.js';
export const exercises=['band-external-rotation'];
const v=a=>new T.Vector3().fromArray(a),up=new T.Vector3(0,1,0);
function basis(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new T.Matrix4().makeBasis(x,y,new T.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName:b,dataByName:d,mesh}){
 if(id!==exercises[0])throw Error('Unknown exercise');
 const aim=(name,rest,dir)=>{mesh.updateMatrixWorld(true);b[name].quaternion.copy(b[name].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(new T.Quaternion().setFromUnitVectors(rest.clone().normalize(),dir.clone().normalize())));mesh.updateMatrixWorld(true);};
 for(const side of ['L','R']){
  const U=v(d['lowerarm01.'+side].head).sub(v(d['upperarm01.'+side].head)),F=v(d['wrist.'+side].head).sub(v(d['lowerarm01.'+side].head));
  const down=new T.Vector3(side==='R'?-.10:0,-1,0).normalize();
  aim('upperarm01.'+side,U,down);
  if(side==='R'){aim('lowerarm01.R',F,new T.Vector3(-.1,-1,.12).normalize());continue;}
  const initial=new T.Vector3(-.5,0,Math.sqrt(.75));
  aim('lowerarm01.L',F,initial);
  const elbowTarget=b['lowerarm01.L'].getWorldPosition(new T.Vector3());
  const angle=T.MathUtils.degToRad(85*lift),upperWorld=b['upperarm01.L'].getWorldQuaternion(new T.Quaternion());
  const targetUpper=new T.Quaternion().setFromAxisAngle(up,angle*.25).multiply(upperWorld);
  b['upperarm01.L'].quaternion.copy(b['upperarm01.L'].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(targetUpper));mesh.updateMatrixWorld(true);
  const secondRest=v(d['lowerarm01.L'].head).sub(v(d['upperarm02.L'].head));
  const secondDirection=elbowTarget.clone().sub(b['upperarm02.L'].getWorldPosition(new T.Vector3())).normalize();
  const secondWorld=new T.Quaternion().setFromAxisAngle(secondDirection,-angle*.75).multiply(new T.Quaternion().setFromUnitVectors(secondRest.clone().normalize(),secondDirection));
  b['upperarm02.L'].quaternion.copy(b['upperarm02.L'].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(secondWorld));mesh.updateMatrixWorld(true);
  aim('lowerarm01.L',F,initial.clone().applyAxisAngle(up,angle));
  const index=v(d['finger2-1.L'].head),little=v(d['finger5-1.L'].head),across=index.clone().sub(little).normalize(),palm=index.add(little).multiplyScalar(.5).sub(v(d['wrist.L'].head)).normalize();
  const direction=initial.clone().applyAxisAngle(up,angle),targetHand=new T.Quaternion().setFromRotationMatrix(basis(direction,up).multiply(basis(palm,across).invert()));
  b['wrist.L'].quaternion.copy(b['wrist.L'].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(targetHand));mesh.updateMatrixWorld(true);
 }
}
