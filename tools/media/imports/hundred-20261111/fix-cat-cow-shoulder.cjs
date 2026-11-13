const fs=require('node:fs'),p='tools/media/imports/hundred-20261111/cat-cow-motion.mjs';let s=fs.readFileSync(p,'utf8');
const marker="byName['neck01'].rotation.x=rad(8*(2*a-1));";
if(s.includes('let lo=40'))throw Error('Already applied');
s=s.replace(marker,marker+`
// Keep shoulder height stable while the pelvis and spinal segments change curvature.
let lo=40,hi=120;
for(let iteration=0;iteration<40;iteration++){
 const tilt=(lo+hi)/2;byName.root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),rad(tilt));mesh.updateMatrixWorld(true);
 byName.root.position.add(wantedHip.clone().sub(byName['upperleg01.L'].getWorldPosition(new THREE.Vector3())));mesh.updateMatrixWorld(true);
 if(byName['upperarm01.L'].getWorldPosition(new THREE.Vector3()).y> -2.35)lo=tilt;else hi=tilt;
}
`);fs.writeFileSync(p,s);
