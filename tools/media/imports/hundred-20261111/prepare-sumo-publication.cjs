const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const base='tools/media/imports/hundred-20261111',ids=['kettlebell-sumo-squat'];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n'),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.ok(!fs.existsSync(base+'/previous-sumo.json'),'Publication already prepared');
const reviews={},source={},preview=read(base+'/sumo-preview-review.json'),batch=read(base+'/batch.json');
for(const id of ids){
 const e=batch.entries.find(e=>e.id===id),dir=base+'/native/'+id,c=read(dir+'/candidate.json'),p=read(dir+'/provenance.json');
 assert.equal(e.status,'awaiting-final-review');
 for(const a of [...c.inputs,...c.outputs])assert.equal(sha(a.file),a.sha256);
 p.limitations=preview[id].limitations.join(' ');p.status='passed-isolated-candidate';write(dir+'/provenance.json',p);
 reviews[id]={reviewedAt:new Date().toISOString(),status:'passed-isolated-candidate',checks:preview[id].checks,limitations:preview[id].limitations,artifacts:['final.jpg','final-dark.jpg','full-sheet.png','side-sheet.png','verification.json','geometry.json','kinematics.json','provenance.json'].map(f=>({file:dir+'/'+f,sha256:sha(dir+'/'+f)})),outputs:c.outputs};
 source[id]={equipment:'kettlebell',url:e.recipe.sourceUrls.at(-1),supportingUrl:e.recipe.sourceUrls[0],criteria:e.recipe.criteria};
 e.status='candidate-reviewed';
}
write(base+'/visual-review-sumo.json',reviews);write(base+'/source-sumo.json',source);write(base+'/batch.json',batch);
const original=JSON.stringify(read(base+'/publication-ids.json'));
for(const name of ['prepare','publish','check-published']){
 let s=fs.readFileSync(base+'/'+name+'.mjs','utf8');assert.ok(s.includes(original),name+' ID list');
 s=s.replaceAll(original,JSON.stringify(ids)).replaceAll("'/previous.json'","'/previous-sumo.json'").replaceAll("'/backup'","'/backup-sumo'").replaceAll("'/backup/'","'/backup-sumo/'").replaceAll("'/source.json'","'/source-sumo.json'").replaceAll("'/visual-review.json'","'/visual-review-sumo.json'").replaceAll('/published-verification.json','/published-sumo-verification.json');
 fs.writeFileSync(base+'/'+name+'-sumo.mjs',s);
}
