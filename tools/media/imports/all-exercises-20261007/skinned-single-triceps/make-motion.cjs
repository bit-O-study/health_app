const fs=require('fs'),b='tools/media/imports/all-exercises-20261007/skinned-single-triceps';let m=fs.readFileSync('tools/media/motion-refresh/skinned-3d/exercise-motion-6.mjs','utf8');m=m.replace(/export const exercises=.*?;/,"export const exercises=['single-arm-overhead-dumbbell-extension'];");const a=m.indexOf("  const sign=side==='L'"),z=m.indexOf("  aim('upperarm01.'",a);m=m.slice(0,a)+`  const sign=side==='L'?1:-1;
  const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];
  const upperRest=v(elbow.head).sub(v(upper.head)),lowerRest=v(wrist.head).sub(v(elbow.head));
  let upperDirection=new THREE.Vector3(sign*.17,-.985,0).normalize(),lowerDirection=upperDirection.clone();
  if(side==='L'){
   byName['clavicle.L'].rotation.z=rad(8);byName['shoulder01.L'].rotation.z=rad(18);
   upperDirection=new THREE.Vector3(.12,.993,0).normalize();
   const flex=rad(120-115*lift);lowerDirection=new THREE.Vector3(.12,Math.cos(flex),-Math.sin(flex)).normalize();
  }
`+m.slice(z);fs.writeFileSync(b+'/motion.mjs',m);
let s=fs.readFileSync(b+'/studio.mjs','utf8').replace('t < .40 ? smooth(t / .40) : t < .46 ? 1 : t < .96 ? 1 - smooth((t - .46) / .50) : 0','t < .05 ? 0 : t < .475 ? smooth((t-.05)/.425) : t < .525 ? 1 : t < .95 ? 1-smooth((t-.525)/.425) : 0');fs.writeFileSync(b+'/studio.mjs',s);
