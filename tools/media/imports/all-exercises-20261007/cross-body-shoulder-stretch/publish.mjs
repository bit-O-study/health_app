import {readFileSync,writeFileSync,copyFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {manageMotionGuides} from '../../../manage-motion-guides.mjs';
const id='cross-body-shoulder-stretch';
const base='tools/media/imports/all-exercises-20261007/'+id;
const root='tools/media/motion-guides',out='public/exercise-guides/ai-v3';
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const evidence=JSON.parse(readFileSync(base+'/render-evidence.json'));
const playback=JSON.parse(readFileSync(base+'/playback.json')).results;
for(const [i,suffix] of ['', '-dark'].entries()){
 if(evidence[i].sha256!==sha(base+'/'+id+suffix+'.mp4')||evidence[i].identicalFrames!==192||!playback[i].play||!playback[i].seek||!playback[i].loop)throw Error('Evidence mismatch');
}
if(existsSync(root+'/'+id+'.json'))throw Error('Already registered; inspect before replacing');
await sharp({create:{width:1920,height:960,channels:3,background:'#fafafa'}}).composite(Array.from({length:8},(_,i)=>({input:base+'/light.png',left:i%4*480,top:Math.floor(i/4)*480}))).jpeg({quality:94}).toFile(root+'/'+id+'.jpg');
copyFileSync(base+'/pose.png',root+'/'+id+'-rig.png');
write(root+'/'+id+'.json',{id,prompt:readFileSync(base+'/prompt.txt','utf8').trim(),equipment:'bodyweight',sources:['https://library.theprehabguys.com/vimeo-video/shoulder-across-body-stretch/'],panels:8,cycle:'reverse',rigSource:id+'-rig.png',renderer:'generated-isometric-v1',timing:'hold',cutout:true,registeredAt:new Date().toISOString()});
for(const suffix of ['', '-dark'])copyFileSync(base+'/'+id+suffix+'.mp4',out+'/'+id+suffix+'.mp4');
const entry={id,renderVersion:'generated-isometric-v1',panels:8,cutout:true,sourceSha256:sha(root+'/'+id+'.jpg'),rigSourceSha256:sha(root+'/'+id+'-rig.png'),videoSha256:sha(out+'/'+id+'.mp4'),darkVideoSha256:sha(out+'/'+id+'-dark.mp4'),width:480,height:480,seconds:8,fps:24,bytes:statSync(out+'/'+id+'.mp4').size,darkBytes:statSync(out+'/'+id+'-dark.mp4').size,decode:'passed',verifiedAt:new Date().toISOString()};
write(root+'/verification.json',[...JSON.parse(readFileSync(root+'/verification.json')).filter(x=>x.id!==id),entry]);
await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks:{exercise:'Cross-body shoulder stretch; static hold, not repetition footage.',equipment:'Bodyweight; no apparatus required or depicted.',setup:'Upright neutral torso, shoulders lowered, full body visible in both themes.',hands:'Opposite hand supports upper arm just above elbow; extended arm crosses chest.',feet:'Both shoes fully visible and feet planted; unchanged throughout hold.',movement:'Intentional 8-second static stretch; all 192 decoded frames identical. Mobile Edge playback, seek and loop passed for both themes.'},notes:'Generated static instructional illustration, not filmed exercise. Light/dark composites visually reviewed; source alpha matte preserved. Local browser emulation only; physical device and professional biomechanics review not performed.'})));
write(base+'/published-evidence.json',entry);
