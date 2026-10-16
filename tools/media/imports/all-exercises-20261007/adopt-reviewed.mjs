import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
import {manageMotionGuides} from '../../manage-motion-guides.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const plan=read(process.argv[2]),root='tools/media/motion-guides',pub='public/exercise-guides/ai-v3';
const audit=read('tools/media/imports/cutout-review-20261007/existing-video-audit.json');
const ready=plan.map(job=>{const id=job.id;if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid id');const candidate=resolve(job.candidate);if(!candidate.startsWith(resolve('tools/media/imports')+'/')&&!candidate.startsWith(resolve('tools/media/imports')+'\\'))throw Error('Candidate outside imports');
 const v=read(join(candidate,root,'verification.json')).find(x=>x.id===id),before=audit.entries.find(x=>x.id===id),old=read(root+'/reviews.json').find(x=>x.id===id);
 if(!v||!old||old.status!=='passed'||!before)throw Error('Missing reviewed original '+id);
 if(sha(root+'/'+id+'.jpg')!==v.sourceSha256||v.sourceSha256!==before.sourceSha256)throw Error('Source changed '+id);
 if(v.decode!=='passed'||v.width!==480||v.height!==480||v.fps!==24||v.seconds!==8)throw Error('Invalid verification '+id);
 for(const suffix of ['','-dark'])if(sha(join(candidate,pub,id+suffix+'.mp4'))!==v[suffix?'darkVideoSha256':'videoSha256'])throw Error('Candidate hash changed '+id);
 const live=sha(pub+'/'+id+'.mp4');if(live!==before.videoSha256&&live!==v.videoSha256)throw Error('Concurrent public edit '+id);
 if(job.rigSource&&sha(job.rigSource)!==job.rigSha256)throw Error('Edited alpha source changed '+id);
 return {job,id,candidate,v,old,already:live===v.videoSha256&&existsSync(pub+'/'+id+'-dark.mp4')&&sha(pub+'/'+id+'-dark.mp4')===v.darkVideoSha256};});
for(const {job,id,candidate,v,old,already} of ready){if(already){console.log(id+': already adopted');continue;}
 const backup=resolve('tools/media/imports/all-exercises-20261007/backups',id);mkdirSync(backup,{recursive:true});
 for(const file of [id+'.mp4',id+'-dark.mp4'])if(existsSync(pub+'/'+file)&&!existsSync(join(backup,file)))copyFileSync(pub+'/'+file,join(backup,file));
 for(const file of ['reviews.json','verification.json'])if(!existsSync(join(backup,file)))copyFileSync(root+'/'+file,join(backup,file));
 if(job.rigSource){
  if(!existsSync(join(backup,id+'.json')))copyFileSync(root+'/'+id+'.json',join(backup,id+'.json'));
  const rigSource=id+'-alpha-edit.png';copyFileSync(job.rigSource,root+'/'+rigSource);
  const spec=read(root+'/'+id+'.json');writeFileSync(root+'/'+id+'.json',JSON.stringify({...spec,rigSource,renderer:'generated-alpha-edit-v1',cutout:true},null,2)+'\n');
  v.rigSourceSha256=sha(root+'/'+rigSource);v.renderVersion='generated-alpha-edit-v1';
 }
 for(const suffix of ['','-dark'])copyFileSync(join(candidate,pub,id+suffix+'.mp4'),pub+'/'+id+suffix+'.mp4');
 const all=read(root+'/verification.json');writeFileSync(root+'/verification.json',JSON.stringify([...all.filter(x=>x.id!==id),{...v,cutoutModel:job.model??'u2netp',candidateEvidence:job.evidence}],null,2)+'\n');
 await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks:old.checks,note:job.note+' Evidence: '+job.evidence+'. Original source retained; previous videos backed up. Physical device/deployment unverified.'})));
}
