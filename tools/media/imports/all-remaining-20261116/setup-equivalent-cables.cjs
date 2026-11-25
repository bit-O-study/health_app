const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root='tools/media/imports/all-remaining-20261116',base=root+'/equivalent-cables',old=root+'/tempo-holds';
fs.mkdirSync(base,{recursive:true});assert.ok(!fs.existsSync(base+'/batch.json'));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n'),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const originals=['straight-arm-pulldown','cable-lateral-raise','face-pull','cable-rope-hammer-curl'],ids=originals.map(id=>id+'-2'),entries=[],master=read(root+'/batch.json'),audit=read('tools/media/motion-refresh/all-exercises-progress.json'),catalog=read('tools/media/ai-guides/catalog.json');
for(const original of originals){
 const id=original+'-2',e=master.entries.find(e=>e.id===id),spec=read('tools/media/motion-guides/'+original+'.json'),provenance=read('tools/media/motion-guides/'+original+'-provenance.json');
 assert.equal(e.status,'awaiting-motion-implementation');assert.equal(audit.entries.find(e=>e.id===original).status,'reviewed-both-themes');assert.equal(spec.equipment,'cable');assert.deepEqual(e.equipment,['cable']);
 const normalizeName=name=>name.replace(/\s/g,'').replace('케이블사이드레터럴','케이블레터럴레이즈');
 assert.equal(normalizeName(catalog.find(e=>e.id===original).name),normalizeName(catalog.find(e=>e.id===id).name),'Names differ');
 for(const x of [...provenance.inputs,...provenance.dependencies])assert.equal(sha(x.path),x.sha256,'Source changed');
 const source=path.dirname(provenance.sourceContact.path).replaceAll('\\','/'),dir=base+'/native/'+id;fs.mkdirSync(dir,{recursive:true});
 for(const n of ['poses.json','full-sheet.png','side-sheet.png'])fs.copyFileSync(source+'/'+n,dir+'/'+n);
 write(dir+'/geometry.json',provenance.geometry||{scope:'Original geometry retained in source provenance; fresh playback and alpha verification required.'});
 write(dir+'/kinematics.json',{...provenance.kinematics,status:'numeric-checks-passed',sourceId:original,sourceProvenanceSha256:sha('tools/media/motion-guides/'+original+'-provenance.json')});
 const outputs=[];for(const [theme,suffix]of [['light','.mp4'],['dark','-dark.mp4'],['alpha','-alpha.webm']]){const file=dir+'/'+id+suffix,sourceFile='public/exercise-guides/ai-v3/'+original+suffix;fs.copyFileSync(sourceFile,file);outputs.push({theme,file,sha256:sha(file),bytes:fs.statSync(file).size,reusedFrom:sourceFile});}
 write(dir+'/candidate.json',{status:'pending-visual-review',width:480,height:480,fps:24,frames:192,seconds:8,outputs,inputs:[...provenance.inputs,...provenance.dependencies].map(x=>({file:x.path,sha256:x.sha256})),reuse:{original,reason:'Catalog entries have identical exercise name and cable equipment; exact reviewed video bytes reused.'}});
 entries.push({id,original,equipment:'cable',hold:false,status:'awaiting-preview-review',recipe:{family:original,sourceUrls:spec.sources,criteria:'Equivalent catalog entry; reuse the exact reviewed cable exercise, with unchanged apparatus, grip and motion.',sourcesCheckedAt:'2026-11-16'}});e.status='motion-preview';e.group='equivalent-cables';
}
write(base+'/batch.json',{entries});write(root+'/batch.json',master);
for(const name of ['verify','finalize','prepare','publish','check-published']){let s=fs.readFileSync(old+'/'+name+'.mjs','utf8').replaceAll(old,base).replaceAll('["tempo-pull-up","tempo-leg-press","isometric-pull-up-hold","isometric-push-up-hold"]',JSON.stringify(ids));fs.writeFileSync(base+'/'+name+'.mjs',s);}
let s=fs.readFileSync(root+'/review-tempo-holds.cjs','utf8').replaceAll(old,base);
s=s.replace("e.original==='tempo-push-up'?'Palms stay on virtual floor.':'Both hands retain apparatus grip.'","'Cable handle grip matches the reviewed original.'").replace("e.original==='leg-press'?'Both feet follow sled footplate.':e.original==='pull-up'?'Legs remain still relative to the torso without swing.':'Toes fixed on virtual floor.'","'Both feet remain planted.'").replace('Timing is illustrative. Holds show the maintained position only; entry and exit are not animated.','Exact reviewed video bytes reused for an equivalent catalog entry; this is a mapping repair, not a newly generated motion.');
fs.writeFileSync(root+'/review-equivalent-cables.cjs',s);console.log(ids);
