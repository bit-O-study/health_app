import * as THREE from './three.module.js';
export const exercises=["skater-jump"];
const v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
function orientation(forward,across){const x=forward.clone().normalize(),y=across.clone().addScaledVector(x,-across.dot(x)).normalize();return new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y));}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 function ik(a,b,c,target,pole){const start=pos(a),u=rest(a,b),l=rest(b,c),axis=target.clone().sub(start),d=axis.length();if(d>=u.length()+l.length()||d<=Math.abs(u.length()-l.length()))throw Error('Unreachable '+a+' '+frame+' '+d);axis.normalize();const along=(u.lengthSq()-l.lengthSq()+d*d)/(2*d);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const middle=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(u.lengthSq()-along*along));aim(a,u,middle.clone().sub(start));aim(b,l,target.clone().sub(middle));}


 const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);},cycle=(((frame%480)+480)%480)/240,half=Math.floor(cycle),u=cycle-half,flight=THREE.MathUtils.clamp((u-.25)/.35,0,1),swap=ease(flight),start=half===0?1:-1,stance=start*(1-2*swap),hop=u>.25&&u<.6?.9*Math.sin(Math.PI*flight):0,depth=u<.25?1-ease(u/.25):u<.6?0:ease((u-.6)/.2);
 byName.root.position.set(stance*2.7,-1.2-1.2*depth+hop,-.9);byName.root.quaternion.setFromAxisAngle(v([1,0,0]),rad(18));
 for(const side of ['L','R']){const sign=side==='L'?1:-1,position=s=>sign===s?v([s*3,-7.15,.2]):v([s*1.5,-5.7,-2.5]),foot=position(start).lerp(position(-start),swap);foot.y+=hop;
 ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,foot,v([sign*.2,0,1]));mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
 const shoulder=pos('upperarm01.'+side),wrist=shoulder.clone().add(v([sign*.5,-2,1.5-sign*stance*1.5]));ik('upperarm01.'+side,'lowerarm01.'+side,'wrist.'+side,wrist,v([sign,-1,-.3]));const across=rest('finger5-1.'+side,'finger2-1.'+side).normalize();for(let f=2;f<=5;f++)for(let j=1;j<=3;j++)byName['finger'+f+'-'+j+'.'+side].quaternion.setFromAxisAngle(across,rad(-sign*[0,20,25,20][j]));
 }return {hop,depth};
}
