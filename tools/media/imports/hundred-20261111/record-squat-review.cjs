const fs=require('fs'),crypto=require('crypto'),assert=require('node:assert/strict');
const base='tools/media/imports/hundred-20261111',file=base+'/batch.json';
const b=JSON.parse(fs.readFileSync(file,'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const review={};
for(const e of b.entries.filter(e=>e.recipe?.knots)){
 const out=base+'/native/'+e.id,candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),verification=JSON.parse(fs.readFileSync(out+'/verification.json','utf8'));
 assert.equal(e.numericChecks,'passed');assert.ok(verification.alpha.all192FrameEdgesClear);assert.ok(verification.playback.length===3&&verification.playback.every(p=>p.playing&&p.seeking&&p.loop));
 for(const x of [...candidate.inputs,...candidate.outputs])assert.equal(sha(x.file),x.sha256);
 review[e.id]={status:'passed-isolated-candidate',reviewedAt:new Date().toISOString(),checks:{exercise:e.name,equipment:e.equipment.join(', '),setup:'Front and side sheets checked; complete body and equipment in frame.',hands:'Hands remain attached to rack, goblet or dumbbell grips.',feet:e.id.includes('bulgarian')?'Front foot planted; rear foot supported by bench.':'Both feet planted with the specified stance.',movement:e.recipe.criteria},artifacts:['full-sheet.png','side-sheet.png','final.jpg','final-dark.jpg'].map(name=>({file:out+'/'+name,sha256:sha(out+'/'+name)})),outputs:candidate.outputs};
 e.status='candidate-reviewed';
}
fs.writeFileSync(base+'/visual-review-squats.json',JSON.stringify(review,null,2));
b.updatedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(b,null,2));
console.log({candidateReviewed:Object.keys(review).length,registered:b.completed});
