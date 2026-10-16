const fs=require('fs');
const b='tools/media/imports/all-exercises-20261007/skinned-calf',old='tools/media/imports/all-exercises-20261007/skinned-reuse-final';
fs.mkdirSync(b,{recursive:true});
fs.copyFileSync('tools/media/motion-refresh/skinned-3d/human.json',b+'/human.json');
let studio=fs.readFileSync(old+'/studio-batch-4.mjs','utf8').replace('exercise-motion-4.mjs','motion.mjs');
studio=studio.replace("else if (view === 'shoulder')", "else if (view === 'feet') { target.set(0,-7.5,1); camera.position.set(15,-5,6); camera.zoom=3.5; }\n  else if (view === 'shoulder')");
studio=studio.replace("'foot.L', 'foot.R'", "'foot.L', 'foot.R', 'toe2-1.L', 'toe2-1.R', 'lowerleg01.L', 'root'");
fs.writeFileSync(b+'/studio.mjs',studio);
let render=fs.readFileSync(old+'/render-4.mjs','utf8').replace(/\["zottman-curl","wide-dumbbell-curl","scaption","alternating-dumbbell-front-raise"\]/,'["dumbbell-standing-calf-raise"]').replaceAll('skinned-reuse-final','skinned-calf').replaceAll('studio-batch-4.mjs','studio.mjs').replace("'exercise-motion-4.mjs':dir+'exercise-motion-4.mjs'","'motion.mjs':'"+b+"/motion.mjs'").replace("'human.json':dir+'human.json'","'human.json':'"+b+"/human.json'").replace("['full','hand','side']","['full','hand','side','feet']");
render=render.replace("inputs:['studio.mjs','exercise-motion-4.mjs','human.json'].map(file=>({file,sha256:hash(dir+file)}))","inputs:['studio.mjs','motion.mjs','human.json'].map(file=>({file,sha256:hash('"+b+"/'+file)}))");
fs.writeFileSync(b+'/render.mjs',render);
let motion=fs.readFileSync('tools/media/motion-refresh/skinned-3d/exercise-motion-4.mjs','utf8').replace("export const exercises = ['zottman-curl','wide-dumbbell-curl','scaption','alternating-dumbbell-front-raise'];","export const exercises = ['dumbbell-standing-calf-raise'];").replace('angle+=108*amount;','angle=5;').replace('let desiredAcross=new THREE.Vector3(sign,0,0);','let desiredAcross=new THREE.Vector3(0,0,sign);');
const at=motion.lastIndexOf('\n}');
motion=motion.slice(0,at)+`
  // Rotate the hindfoot about the metatarsal pivot. Translate the proximal
  // skeleton only by the ankle displacement required by that fixed pivot.
  const a=rad(30*lift),axis=new THREE.Vector3(1,0,0);
  const ankle=v(dataByName['foot.L'].head),pivot=v(dataByName['toe2-1.L'].head);
  const displacement=pivot.clone().sub(ankle).sub(pivot.clone().sub(ankle).applyAxisAngle(axis,a));
  byName.root.position.add(displacement);
  for(const side of ['L','R']){
    byName['foot.'+side].rotation.x=a;
    for(let toe=1;toe<=5;toe++)byName['toe'+toe+'-1.'+side].rotation.x=-a;
  }
`+motion.slice(at);
fs.writeFileSync(b+'/motion.mjs',motion);
