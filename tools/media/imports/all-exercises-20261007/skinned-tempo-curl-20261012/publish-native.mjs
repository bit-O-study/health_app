import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {manageMotionGuides} from '../../../manage-motion-guides.mjs';
const base='tools/media/imports/all-exercises-20261007/skinned-tempo-curl-20261012/native',root='tools/media/motion-guides',pub='public/exercise-guides/ai-v3';
const ids=['tempo-curl'];
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const jobs=ids.map(id=>{
 const review=read(`${base}/${id}-review.json`),provenance=read(`${base}/${id}-provenance.json`);
 for(const file of [`${root}/${id}.json`,`${root}/${id}.jpg`,`${root}/${id}-provenance.json`,`${pub}/${id}.mp4`,`${pub}/${id}-dark.mp4`])if(existsSync(file))throw Error('Existing target: '+file);
 for(const kind of ['reviews','verification'])if(read(`${root}/${kind}.json`).some(x=>x.id===id))throw Error('Existing record '+id);
 if(review.status!=='passed-isolated-candidate'||JSON.stringify(review.equipmentIds)!=='["dumbbell"]')throw Error('Incomplete review/equipment');
 if(review.playback.results.length!==2||!review.playback.results.every(x=>x.play&&x.seek&&x.loop&&x.width===480&&x.height===480&&x.duration===8))throw Error('Incomplete playback');
 if(sha(`${base}/${id}.jpg`)!==review.sourceSha256||sha(`${base}/${id}-provenance.json`)!==review.rigSourceSha256)throw Error('Source changed');
 for(const item of [...provenance.inputs,...provenance.dependencies])if(sha(item.path)!==item.sha256)throw Error('Source chain changed '+item.path);
 if(JSON.stringify(review.sources)!==JSON.stringify(provenance.sourceUrls))throw Error('Sources changed');
 if(review.themes.length!==2)throw Error('Both themes required');
 for(const [i,suffix] of ['', '-dark'].entries()){const t=review.themes[i],file=`${base}/${id}${suffix}.mp4`;if(t.file!==file||t.suffix!==suffix||sha(file)!==t.sha256||t.decode!=='passed'||t.width!==480||t.height!==480||t.fps!==24||t.frames!==192||t.seconds!==8||readFileSync(file).length!==t.bytes)throw Error('Invalid theme '+id+suffix);}
 if(review.videoSha256!==review.themes[0].sha256||review.darkVideoSha256!==review.themes[1].sha256)throw Error('Review hash mismatch');
 for(const k of ['exercise','equipment','setup','hands','feet','movement'])if(!review.checks[k]?.trim())throw Error('Missing check '+k);
 if(!provenance.render.phase.startsWith('continuous: two repetitions; curl0-1, lower1-4, curl4-5, lower5-8; 3-0-1-0 tempo'))throw Error('Phase mismatch');
 if(review.kinematics.phaseAnchorError!==0||JSON.stringify(review.kinematics.peakFrames)!=='[60,300]'||JSON.stringify(review.kinematics.bottomFrames)!=='[0,240,480]')throw Error('Actual tempo mismatch');return {id,review};
});
if(!process.argv.includes('--publish')){console.log('Guards passed, check-only; --publish adopts after root visual review.');process.exit(0);}
for(const {id,review} of jobs){
 const rigSource=id+'-provenance.json';copyFileSync(`${base}/${id}.jpg`,`${root}/${id}.jpg`);copyFileSync(`${base}/${id}-provenance.json`,`${root}/${rigSource}`);
 write(`${root}/${id}.json`,{id,equipment:'dumbbell',panels:16,cycle:'reverse',timing:'continuous',renderer:'skinned-pilot-v1',rigSource,cutout:true,sources:review.sources,sourceKind:'Diagnostic contact sheet; procedural model and motion inputs tracked by provenance',registeredAt:new Date().toISOString()});
 for(const suffix of ['', '-dark'])copyFileSync(`${base}/${id}${suffix}.mp4`,`${pub}/${id}${suffix}.mp4`);
 const entry={id,renderVersion:'skinned-pilot-v1',panels:16,cutout:true,sourceSha256:review.sourceSha256,rigSourceSha256:review.rigSourceSha256,videoSha256:review.videoSha256,darkVideoSha256:review.darkVideoSha256,width:480,height:480,fps:24,seconds:8,bytes:review.themes[0].bytes,darkBytes:review.themes[1].bytes,decode:'passed',verifiedAt:new Date().toISOString()};
 write(`${root}/verification.json`,[...read(`${root}/verification.json`),entry]);
 await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks:review.checks,note:'Root adoption after both-theme32-frame sheets and hand/side/feet closeups. Standing bilateral supinated tempo dumbbell curl with ordinary handles, fixed upperarms and grounded feet.481pose joint/grip/loop/phase validation,17pose equipment clearance, full decode and mobile Edge playback. Two1second lifts and3second lowerings per8seconds, continuous timing. Generic mannequin and sampled geometry limitations recorded.'})));
 write(`${base}/${id}-published.json`,entry);
}
