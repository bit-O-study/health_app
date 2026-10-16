import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { manageMotionGuides } from '../../../manage-motion-guides.mjs';
const base='tools/media/imports/all-exercises-20261007/skinned-floor-fly-20261014/native';
const root='tools/media/motion-guides', pub='public/exercise-guides/ai-v3';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const jobs=['dumbbell-floor-fly'].map(id=>{
 const review=read(`${base}/${id}-review.json`), provenance=read(`${base}/${id}-provenance.json`);
 if(existsSync(`${root}/${id}.json`)||existsSync(`${pub}/${id}.mp4`))throw Error('Existing target '+id);
 if(review.status!=='passed-isolated-candidate'||!review.playback.results.every(x=>x.play&&x.seek&&x.loop))throw Error('Review incomplete');
 if(sha(`${base}/${id}.jpg`)!==review.sourceSha256||sha(`${base}/${id}-provenance.json`)!==review.rigSourceSha256)throw Error('Source changed');
 for(const input of [...provenance.inputs,...provenance.dependencies])if(sha(input.path)!==input.sha256)throw Error('Source chain changed: '+input.path);
 for(const theme of review.themes)if(sha(theme.file)!==theme.sha256||theme.decode!=='passed'||theme.width!==480||theme.height!==480||theme.fps!==24||theme.frames!==192||theme.seconds!==8)throw Error('Invalid video');
 return {id,review};
});
for(const {id,review} of jobs){
 const rigSource=id+'-provenance.json';
 copyFileSync(`${base}/${id}.jpg`,`${root}/${id}.jpg`);
 copyFileSync(`${base}/${id}-provenance.json`,`${root}/${rigSource}`);
 write(`${root}/${id}.json`,{id,equipment:'dumbbell',panels:16,timing:'smooth',renderer:'skinned-pilot-v1',rigSource,cutout:true,sources:review.sources,sourceKind:'Diagnostic contact sheet; procedural model and motion inputs tracked by provenance',registeredAt:new Date().toISOString()});
 for(const suffix of ['','-dark'])copyFileSync(`${base}/${id}${suffix}.mp4`,`${pub}/${id}${suffix}.mp4`);
 const entry={id,renderVersion:'skinned-pilot-v1',panels:16,cutout:true,sourceSha256:review.sourceSha256,rigSourceSha256:review.rigSourceSha256,videoSha256:review.videoSha256,darkVideoSha256:review.darkVideoSha256,width:480,height:480,fps:24,seconds:8,bytes:review.themes[0].bytes,darkBytes:review.themes[1].bytes,decode:'passed',verifiedAt:new Date().toISOString()};
 write(`${root}/verification.json`,[...read(`${root}/verification.json`),entry]);
 const checks={...review.checks};

 await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks,note:'Dumbbell floor fly: neutral grip and constant30degree elbow bend. Bilateral shoulder arc; posterior upper arms touch floor at bottom while dumbbells remain clear. Head,clothed pelvis and feet supported;481pose and final both32frame/closeup/decode/Edge reviewed. Training.fit exact floor-fly protocol. Smooth0.4/3.8/4.2/7.6. '+review.limitations})));
 write(`${base}/${id}-published.json`,entry);
}


