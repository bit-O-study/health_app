import {readFileSync,writeFileSync,copyFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {manageMotionGuides} from '../../../manage-motion-guides.mjs';
const id='band-triceps-pushdown';
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
write(root+'/'+id+'.json',{id,prompt:readFileSync(base+'/prompt.txt','utf8').trim(),equipment:'band',sources:['https://m.media-amazon.com/images/G/01/AmazonBasics/Tube_Resistance_Bands_Manual_Page_Order._CB502058776_.pdf'],panels:16,cycle:'reverse',rigSource:id+'-rig.png',renderer:'generated-alpha-atlas-v1',timing:'push-return',cutout:true,registeredAt:new Date().toISOString()});
for(const suffix of ['', '-dark'])copyFileSync(base+'/'+id+suffix+'.mp4',out+'/'+id+suffix+'.mp4');
const entry={id,renderVersion:'generated-alpha-atlas-v1',panels:16,cutout:true,sourceSha256:sha(root+'/'+id+'.jpg'),rigSourceSha256:sha(root+'/'+id+'-rig.png'),videoSha256:sha(out+'/'+id+'.mp4'),darkVideoSha256:sha(out+'/'+id+'-dark.mp4'),width:480,height:480,seconds:8,fps:24,bytes:statSync(out+'/'+id+'.mp4').size,darkBytes:statSync(out+'/'+id+'-dark.mp4').size,decode:'passed',verifiedAt:new Date().toISOString()};
write(root+'/verification.json',[...JSON.parse(readFileSync(root+'/verification.json')).filter(x=>x.id!==id),entry]);
await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks:{exercise:'Standing resistance-band triceps pushdown; elbows extend downward then return.',equipment:'Red band held by hands and attached to visible high anchor on post; no missing anchor, band or shoes in reviewed frames.',setup:'Standing side view, torso controlled, upper arms beside torso; head and shoes fit within final video.',hands:'Hands keep band grip through downward forearm arc; no detached hands.',feet:'Both shoes remain visible and planted throughout sequence.',movement:'16 progressive elbow extension poses reversed for return. Both32-frame decoded sheets inspected; no major ghosting or missing band in sampled frames. Full decode and mobile Edge play/seek/loop passed.'},notes:'Generated illustrative animation, not filmed exercise. Preserved original alpha without neural background inference. Whole-cell crops preserve post anchor near source boundary. Minor source pose variation remains; physical device and professional biomechanics review not performed.'})));
write(base+'/published-evidence.json',entry);
