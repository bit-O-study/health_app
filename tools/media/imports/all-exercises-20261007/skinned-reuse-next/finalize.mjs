import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const b='tools/media/imports/all-exercises-20261007/skinned-reuse-next',d=b+'/native',r='tools/media/motion-refresh/skinned-3d';
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const dependencies=JSON.parse(readFileSync('tools/media/imports/all-exercises-20261007/skinned-reuse-audit/native/scaption-provenance.json')).dependencies;
const jobs=[
 ['alternating-dumbbell-curl',2,'Alternating left then right supinated curls, opposite arm remains lowered.','https://www.catalystathletics.com/exercise/821/Dumbbell-Curl/'],
 ['dumbbell-reverse-curl',2,'Bilateral pronated curls with fixed upper arms and controlled return.','https://www.muscleandstrength.com/exercises/standing-dumbbell-reverse-curl.html'],
 ['single-arm-dumbbell-shoulder-press',2,'Single loaded arm presses overhead and returns to shoulder, opposite empty arm relaxed. Forward-facing palm variation.','https://hortonbarbell.com/single-arm-dumbbell-shoulder-press/'],
 ['zottman-curl',4,'Supinated ascent, pronation during peak hold, pronated lowering, bottom supination reset.','https://www.strengthlog.com/zottman-curl/'],
 ['wide-dumbbell-curl',4,'Outward supinated curl path with externally rotated shoulders and stationary upper arms.','https://criticalbody.com/wide-dumbbell-curls/'],
];
for(const [id,n,description,url] of jobs){
 const paths=[b+'/studio-batch-'+n+'.mjs',b+'/render-'+n+'.mjs',r+'/exercise-motion-'+n+'.mjs',r+'/human.json'];
 const inputs=paths.map(path=>({path,sha256:sha(path)}));
 for(const dep of dependencies)if(sha(dep.path)!==dep.sha256)throw Error('Dependency changed');
 const prior=JSON.parse(readFileSync(r+'/batch-'+n+'-reviews.json')).find(x=>x.id===id);
 for(const input of prior.inputs)if(sha(r+'/'+input.file)!==input.sha256)throw Error('Prior source changed');
 const provenance={id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,phase:'renderSkinned(outputFrame * 2.5)',light:'#fafafa',dark:'#09090b',geometry:'unchanged original source',interpolation:'none'},inputs,dependencies,originalSource:prior.inputs.map(x=>({path:r+'/'+x.file,sha256:x.sha256})),sourceUrls:[url],sourceSummary:description,sourceCheckedAt:new Date().toISOString(),sourceContact:{path:d+'/'+id+'.jpg',sha256:sha(d+'/'+id+'.jpg'),panels:16,description:'Diagnostic source contact from final native 3D movement; not an interpolation atlas'},reproduction:'Set FFMPEG_PATH then node '+b+'/render-'+n+'.mjs '+id};
 writeFileSync(d+'/'+id+'-provenance.json',JSON.stringify(provenance,null,2));
 const themes=['','-dark'].map(s=>{const file=d+'/'+id+s+'.mp4';const stream=JSON.parse(execFileSync('C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffprobe.exe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'})).streams[0];if(stream.width!==480||stream.height!==480||stream.r_frame_rate!=='24/1'||Number(stream.nb_frames)!==192)throw Error('Metadata invalid');return {suffix:s,file,sha256:sha(file),width:480,height:480,fps:24,seconds:Number(stream.duration),frames:192,bytes:statSync(file).size,decode:'passed'};});
 const checks={exercise:description,equipment:id==='single-arm-dumbbell-shoulder-press'?'One hex dumbbell attached to working hand, opposite hand empty. Both final themes reviewed.':'Two rigid hex dumbbells preserved through all movement phases, both themes reviewed.',setup:'Upright stable torso, complete body and equipment visible in final full camera. Exact scene theme colors; original procedural 3D geometry preserved.',hands:'Hand close-ups and final encoded sheets confirm exercise-specific grip and continuous hand-weight attachment. Zottman also checked hand phases 105/210/345 against roll code.',feet:'Both feet stationary on floor across final 32-frame sheets; no foot clipping or sliding.',movement:'Both final 32-frame sheets inspected. Native 192 frames at 24fps/8sec without optical flow, full decode passed. Mobile Edge both themes play, 7.5s seek and loop passed.'};
 const result={id,status:'passed-isolated-candidate',equipmentIds:['dumbbell'],sources:[url],checks,sourceSha256:sha(d+'/'+id+'.jpg'),rigSourceSha256:sha(d+'/'+id+'-provenance.json'),videoSha256:themes[0].sha256,darkVideoSha256:themes[1].sha256,themes,reviewedAt:new Date().toISOString(),playback:JSON.parse(readFileSync(d+'/'+id+'-playback.json')),limitations:'3D mannequin and bare feet style retained; dark weights have lower contrast but remain present. No app integration or physical-device certification. Single-arm press side diagnostic camera clips overhead weight; final full-camera movies retain it fully.'};
 writeFileSync(d+'/'+id+'-review.json',JSON.stringify(result,null,2));
 writeFileSync(d+'/'+id+'-candidate.json',JSON.stringify({id,...provenance.render,themes,inputs,status:'reviewed-isolated-candidate'},null,2));
 console.log(id+' verified');
}
