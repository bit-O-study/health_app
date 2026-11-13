const fs = require('node:fs');
const base = 'tools/media/imports/hundred-20261111';
const batch = JSON.parse(fs.readFileSync(base + '/batch.json', 'utf8'));
const entry = batch.entries.find(e => e.id === 'jump-squat');
if (entry.status !== 'awaiting-motion-implementation') throw Error('Already started');
let motion = fs.readFileSync('tools/media/imports/directional-three-20261019/motion.mjs', 'utf8');
motion = motion.replace("['side-lunge','dumbbell-jump-squat','kettlebell-lunge']", "['jump-squat']").replaceAll('dumbbell-jump-squat', 'jump-squat');
// Unloaded arm swing follows the dip and extension instead of carrying weights.
motion = motion.replace("new THREE.Vector3(sign*.18,-1,lateral?.22:.02)", "new THREE.Vector3(sign*.18,-1,-.45*depth+.8*hop/1.5)").replace("new THREE.Vector3(sign*.18,-1,lateral?.30:.10)", "new THREE.Vector3(sign*.18,-.8,.25+.9*hop/1.5)");
motion = motion.replace('rad(-sign*[0,65,80,50][joint])', 'rad(-sign*[0,12,18,10][joint])');
fs.writeFileSync(base + '/jump-squat-motion.mjs', motion);
let studio = fs.readFileSync(base + '/decline-push-up-studio.mjs', 'utf8');
studio = studio.slice(0, studio.indexOf("const decline=exercise")) + `
const restPositions=bones.map(b=>b.position.clone());
function pose(frame){for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}applyMotion(exercise,0,{byName,dataByName,mesh},frame);mesh.updateMatrixWorld(true);skeleton.update();}
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=.88;camera.position.set(view==='side'?32:14,3,view==='side'?0:30);camera.lookAt(0,1,0);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1','upperarm01','lowerarm01','wrist'])j[n+'.'+side]=byName[n+'.'+side].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();return j;};
window.inspectGeometry=frame=>{pose(frame);const minimum={body:Infinity,toes:Infinity,cloth:Infinity};for(let i=0;i<geometry.attributes.position.count;i++){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));let k=0;for(let a=1;a<4;a++)if(model.skinWeights[i*4+a]>model.skinWeights[i*4+k])k=a;const name=model.bones[model.skinIndices[i*4+k]].name;minimum.body=Math.min(minimum.body,p.y);if(/^toe/.test(name))minimum.toes=Math.min(minimum.toes,p.y);}for(let i=0;i<clothGeometry.attributes.position.count;i++)minimum.cloth=Math.min(minimum.cloth,shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i)).y);return {...minimum,floorClearance:minimum.body+7.9};};
window.renderSkinned(0);window.ready=true;
`;
fs.writeFileSync(base + '/jump-squat-studio.mjs', studio);
entry.status = 'motion-preview';
entry.recipe = { family: 'jump-squat', sourceUrls: ['https://www.acefitness.org/resources/everyone/exercise-library/222/squat-jump/'], criteria: 'Unloaded squat dip, simultaneous vertical takeoff, airborne extension and bent-knee landing; feet return to the same stance.', sourcesCheckedAt: '2026-11-12' };
fs.writeFileSync(base + '/batch.json', JSON.stringify(batch, null, 2) + '\n');
