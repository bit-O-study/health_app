import {readFileSync,writeFileSync,copyFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {manageMotionGuides} from '../../../manage-motion-guides.mjs';
const id='band-front-raise';
const base='tools/media/imports/all-exercises-20261007/'+id;
const root='tools/media/motion-guides',out='public/exercise-guides/ai-v3';
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const evidence=JSON.parse(readFileSync(base+'/render-evidence.json'));
const playback=JSON.parse(readFileSync(base+'/playback.json')).results;
for(const [i,suffix] of ['', '-dark'].entries()){
 if(evidence[i].sha256!==sha(base+'/'+id+suffix+'.mp4')||!playback[i].play||!playback[i].seek||!playback[i].loop)throw Error('Evidence mismatch');
}
if(existsSync(root+'/'+id+'.json'))throw Error('Already registered; inspect before replacing');
copyFileSync(base+'/light-source.jpg',root+'/'+id+'.jpg');
copyFileSync(base+'/source.png',root+'/'+id+'-rig.png');
write(root+'/'+id+'.json',{id,prompt:readFileSync(base+'/prompt.txt','utf8').trim(),equipment:'band',sources:['https://www.performancehealth.com/articles/33-theraband-resistance-band-exercises-to-do-at-home'],panels:16,cycle:'reverse',rigSource:id+'-rig.png',renderer:'generated-alpha-atlas-v1',timing:'raise-lower',cutout:true,registeredAt:new Date().toISOString()});
for(const suffix of ['', '-dark'])copyFileSync(base+'/'+id+suffix+'.mp4',out+'/'+id+suffix+'.mp4');
const entry={id,renderVersion:'generated-alpha-atlas-v1',panels:16,cutout:true,sourceSha256:sha(root+'/'+id+'.jpg'),rigSourceSha256:sha(root+'/'+id+'-rig.png'),videoSha256:sha(out+'/'+id+'.mp4'),darkVideoSha256:sha(out+'/'+id+'-dark.mp4'),width:480,height:480,seconds:8,fps:24,bytes:statSync(out+'/'+id+'.mp4').size,darkBytes:statSync(out+'/'+id+'-dark.mp4').size,decode:'passed',verifiedAt:new Date().toISOString()};
write(root+'/verification.json',[...JSON.parse(readFileSync(root+'/verification.json')).filter(x=>x.id!==id),entry]);
await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks:{exercise:'Standing bilateral resistance-band front raise, arms lift forward to shoulder height then lower.',equipment:'One red resistance band under both shoes, both ends held; no missing segments in reviewed frames.',setup:'Upright torso, shoulders lowered, full body visible; no cut off head or shoes.',hands:'Both hands maintain band contact; wrists neutral and elbows softly bent.',feet:'Both feet support band on floor throughout sequence.',movement:'First12 poses of16 used for forward ascent, pose12 held then reversed for descent; poses13-16 excluded because hands exceed shoulder height. Both32 decoded frame sheets inspected, band/hand contact and shoes preserved. Full decode and final mobile Edge play/seek/loop passed.'},notes:'Generated illustrative motion. Source alpha preserved without segmentation inference. Twelve selected poses with peak hold interpolated and inspected in both themes. Minor original silhouette/torso variation remains; whole cells used without inset clipping. Physical device and professional biomechanics review not performed.'})));
write(base+'/published-evidence.json',entry);
