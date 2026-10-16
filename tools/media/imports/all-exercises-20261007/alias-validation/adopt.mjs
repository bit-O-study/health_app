import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {manageMotionGuides} from '../../../manage-motion-guides.mjs';
const base='tools/media/imports/all-exercises-20261007/alias-validation';
const root='tools/media/motion-guides',pub='public/exercise-guides/ai-v3';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const catalog=read('tools/media/ai-guides/catalog.json');
const jobs=read(base+'/review.json').results;
for(const job of jobs){
 const {sourceId,targetId,equipment}=job;
 if(!['hammer-curl','ez-bar-curl'].includes(targetId)||job.decision!=='recommended-for-exact-alias')throw Error('Unreviewed alias');
 if(!catalog.find(x=>x.id===targetId)?.equipments.some(x=>x.equipment===equipment))throw Error('Equipment mismatch');
 if(existsSync(root+'/'+targetId+'.json'))throw Error('Target already registered');
 for(const f of job.files)if(!f.fullDecode||sha(f.source)!==f.sha256)throw Error('Artifact changed');
 if(!job.browser.results.every(x=>x.play&&x.seek&&x.loop))throw Error('Playback incomplete');
 const review=read(root+'/reviews.json').find(x=>x.id===sourceId);
 if(review?.status!=='passed'||review.sourceSha256!==sha(root+'/'+sourceId+'.jpg')||review.videoSha256!==sha(pub+'/'+sourceId+'.mp4')||review.darkVideoSha256!==sha(pub+'/'+sourceId+'-dark.mp4'))throw Error('Source approval stale');
 const spec=read(root+'/'+sourceId+'.json');
 if(spec.rigSource&&review.rigSourceSha256!==sha(root+'/'+spec.rigSource))throw Error('Rig changed');
}
for(const {sourceId,targetId,identity,limitations} of jobs){
 const spec=read(root+'/'+sourceId+'.json');
 copyFileSync(root+'/'+sourceId+'.jpg',root+'/'+targetId+'.jpg');
 // Keep the exact approved rig reference; it is tracked alongside the original source.
 write(root+'/'+targetId+'.json',{...spec,id:targetId,aliasOf:sourceId,aliasReason:identity,registeredAt:new Date().toISOString()});
 for(const suffix of ['', '-dark'])copyFileSync(pub+'/'+sourceId+suffix+'.mp4',pub+'/'+targetId+suffix+'.mp4');
 const verification=read(root+'/verification.json'),entry=verification.find(x=>x.id===sourceId);
 write(root+'/verification.json',[...verification,{...entry,id:targetId,aliasOf:sourceId,verifiedAt:new Date().toISOString()}]);
 const old=read(root+'/reviews.json').find(x=>x.id===sourceId);
 await manageMotionGuides('motion-review',targetId,encodeURIComponent(JSON.stringify({status:'passed',checks:old.checks,aliasOf:sourceId,note:identity+' Exact approved asset reused for equivalent catalog ID, not a newly generated movement. Evidence: '+base+'/review.json. '+limitations})));
}
write(base+'/adopted.json',{at:new Date().toISOString(),aliases:jobs.map(({targetId,sourceId})=>({targetId,sourceId,videoSha256:sha(pub+'/'+targetId+'.mp4'),darkVideoSha256:sha(pub+'/'+targetId+'-dark.mp4')}))});
