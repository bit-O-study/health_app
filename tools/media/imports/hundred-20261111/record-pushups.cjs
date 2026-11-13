const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const base='tools/media/imports/hundred-20261111',ids=['decline-push-up','close-grip-push-up','wide-push-up'];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n'),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const batch=read(base+'/batch.json'),reviews={};
assert.equal(process.argv[2],'preview','Only the inspected preview stage is recorded here');
for(const id of ids){
 const e=batch.entries.find(e=>e.id===id),dir=base+'/native/'+id,k=read(dir+'/kinematics.json');assert.equal(k.status,'numeric-checks-passed');
 const artifacts=['full-sheet.png','side-sheet.png','poses.json','geometry.json','kinematics.json'].map(f=>({file:dir+'/'+f,sha256:sha(dir+'/'+f)}));
 reviews[id]={reviewedAt:new Date().toISOString(),status:'preview-approved',artifacts,checks:{exercise:'Push-up: rigid torso and legs lower together and return.',equipment:id==='decline-push-up'?'Feet on raised platform; both hands below.':'Bodyweight with no equipment.',setup:'Front oblique and side 8-frame sheets inspected; head, waist and leg alignment retained.',hands:id==='close-grip-push-up'?'Palms narrower than shoulders; tucked elbows.':'Separate fixed palms; wide version visibly wider than shoulders.',feet:'Both toe supports remain fixed; elevated only for decline.',movement:'Upper elbows 170.9–172.4 degrees; lower elbows 84.6–85.9 degrees, continuous cycle with no jump.'},limitations:['Elbows retain 7.6–9.1 degrees of flexion at top; chest does not contact the floor.','No rendered floor; support measured against virtual floor at -7.9.','Sampled geometry checks are not complete mesh collision or human motion certification.']};
 e.status='preview-approved';e.numericChecks='passed';delete e.error;e.recipe.sourcesCheckedAt='2026-11-12';e.recipe.limitations=reviews[id].limitations;
 if(id==='close-grip-push-up')e.recipe.sourceUrls=['https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/'];
}
write(base+'/pushups-preview-review.json',reviews);write(base+'/batch.json',batch);
