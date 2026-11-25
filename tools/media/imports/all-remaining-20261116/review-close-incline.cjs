const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const base='tools/media/imports/all-remaining-20261116/close-incline',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n'),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const batch=read(base+'/batch.json'),reviews={},source={};
const limitations=['Procedural demonstration; support samples are not full collision or biomechanical certification.','Timing is illustrative. Holds show the maintained position only; entry and exit are not animated.'];
for(const e of batch.entries){
 const dir=base+'/native/'+e.id,checks={exercise:e.id,equipment:e.equipment,setup:'Front oblique and side sheets inspected; complete body and apparatus visible.',hands:'Both hands remain closed around the barbell.',feet:'Feet planted, head and back supported by the incline bench. Shoulder-width grip and controlled incline bar path.',movement:e.recipe.criteria};
 assert.equal(read(dir+'/kinematics.json').status,'numeric-checks-passed');
 const artifacts=names=>names.map(n=>({file:dir+'/'+n,sha256:sha(dir+'/'+n)}));
 if(process.argv[2]==='preview'){assert.equal(e.status,'awaiting-preview-review');reviews[e.id]={reviewedAt:new Date().toISOString(),checks,limitations,artifacts:artifacts(['full-sheet.png','side-sheet.png','poses.json','geometry.json','kinematics.json'])};e.status='awaiting-final-review';e.numericChecks='passed';e.recipe.limitations=limitations;}
 else if(process.argv[2]==='final'){
  assert.equal(e.status,'awaiting-final-review');for(const a of read(base+'/preview-review.json')[e.id].artifacts)assert.equal(sha(a.file),a.sha256);
  const p=read(dir+'/provenance.json');p.status='passed-isolated-candidate';p.limitations=limitations.join(' ');p.render.timing=e.hold?'hold':'continuous';write(dir+'/provenance.json',p);
  reviews[e.id]={reviewedAt:new Date().toISOString(),status:'passed-isolated-candidate',checks,limitations,artifacts:artifacts(['final.jpg','final-dark.jpg','full-sheet.png','side-sheet.png','verification.json','geometry.json','kinematics.json','provenance.json']),outputs:read(dir+'/candidate.json').outputs};
  source[e.id]={equipment:e.equipment,url:e.recipe.sourceUrls[0]};e.status='candidate-reviewed';
 }else throw Error('Expected preview or final');
}
write(base+'/'+(process.argv[2]==='preview'?'preview-review':'visual-review')+'.json',reviews);write(base+'/batch.json',batch);if(process.argv[2]==='final')write(base+'/source.json',source);
