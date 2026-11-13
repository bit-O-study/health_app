const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const base='tools/media/imports/hundred-20261111',ids=['kettlebell-swing'];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n'),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.ok(!fs.existsSync(base+'/previous-swing.json'),'Publication already prepared');
const reviews={},source={},preview=read(base+'/swing-preview-review.json'),batch=read(base+'/batch.json');
for(const id of ids){
 const e=batch.entries.find(e=>e.id===id),dir=base+'/native/'+id,c=read(dir+'/candidate.json'),p=read(dir+'/provenance.json');
 assert.equal(e.status,'awaiting-final-review');
 for(const a of [...c.inputs,...c.outputs])assert.equal(sha(a.file),a.sha256);
 p.limitations=preview[id].limitations.join(' ');p.status='passed-isolated-candidate';write(dir+'/provenance.json',p);
 reviews[id]={reviewedAt:new Date().toISOString(),status:'passed-isolated-candidate',checks:preview[id].checks,limitations:preview[id].limitations,artifacts:['final.jpg','final-dark.jpg','full-sheet.png','side-sheet.png','verification.json','geometry.json','kinematics.json','provenance.json'].map(f=>({file:dir+'/'+f,sha256:sha(dir+'/'+f)})),outputs:c.outputs};
 source[id]={equipment:'kettlebell',url:e.recipe.sourceUrls.at(-1),supportingUrl:e.recipe.sourceUrls[0],criteria:e.recipe.criteria};
 e.status='candidate-reviewed';
}
write(base+'/visual-review-swing.json',reviews);write(base+'/source-swing.json',source);write(base+'/batch.json',batch);
const original=JSON.stringify(read(base+'/publication-ids.json'));
for(const name of ['prepare','publish','check-published']){
 let s=fs.readFileSync(base+'/'+name+'.mjs','utf8');assert.ok(s.includes(original),name+' ID list');
 s=s.replaceAll(original,JSON.stringify(ids)).replaceAll("'/previous.json'","'/previous-swing.json'").replaceAll("'/backup'","'/backup-swing'").replaceAll("'/backup/'","'/backup-swing/'").replaceAll("'/source.json'","'/source-swing.json'").replaceAll("'/visual-review.json'","'/visual-review-swing.json'").replaceAll('/published-verification.json','/published-swing-verification.json');
 fs.writeFileSync(base+'/'+name+'-swing.mjs',s);
}
