const fs=require('node:fs'),base='tools/media/imports/hundred-20261111',batch=JSON.parse(fs.readFileSync(base+'/batch.json')),e=batch.entries.find(e=>e.id==='nordic-hamstring-curl');
if(e.status!=='awaiting-motion-implementation')throw Error('Already started');
let s=fs.readFileSync(base+'/jump-squat-studio.mjs','utf8');
s=s.replace('const restPositions=',`const padMaterial=new THREE.MeshStandardMaterial({color:'#263b45',roughness:1});
const kneePad=new THREE.Mesh(new THREE.BoxGeometry(4.5,.4,2),padMaterial);kneePad.position.set(0,-7.4,0);scene.add(kneePad);
const basePlate=new THREE.Mesh(new THREE.BoxGeometry(6,.3,7),padMaterial);basePlate.position.set(0,-7.85,-2.5);scene.add(basePlate);
for(const x of [-2.6,2.6]){const post=new THREE.Mesh(new THREE.BoxGeometry(.25,1.6,.4),padMaterial);post.position.set(x,-6.9,-4);scene.add(post);}
const roller=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,5.4,24),padMaterial);roller.rotation.z=Math.PI/2;roller.position.set(0,-5.9,-4);scene.add(roller);
const restPositions=`);
s=s.replace("camera.zoom=.88","camera.zoom=.98").replace("camera.lookAt(0,1,0)","camera.lookAt(0,-1,1)");
s=s.replace('const minimum={body:Infinity,toes:Infinity,cloth:Infinity}','const minimum={body:Infinity,toes:Infinity,cloth:Infinity,knees:Infinity,ankleMax:-Infinity}');
s=s.replace('minimum.body=Math.min(minimum.body,p.y);',"minimum.body=Math.min(minimum.body,p.y);if(/^lowerleg01/.test(name)&&p.z>-.7)minimum.knees=Math.min(minimum.knees,p.y);if(/^foot/.test(name)&&p.z<-3.8&&p.z>-4.3)minimum.ankleMax=Math.max(minimum.ankleMax,p.y);");
fs.writeFileSync(base+'/nordic-hamstring-curl-studio.mjs',s);e.status='motion-preview';e.recipe={family:'nordic-hamstring-curl',sourceUrls:['https://theprehabguys.com/vimeo-video/nordic-curl/'],criteria:'Kneeling with ankles secured under a padded restraint, hips extended; controlled 45-degree forward lean and return, limited-range variation.',sourcesCheckedAt:'2026-11-12'};fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');
