import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/loaded-three-20261019';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const read=f=>JSON.parse(readFileSync(f)),write=(f,o)=>writeFileSync(f,JSON.stringify(o,null,2)+'\n');
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const id of ['dumbbell-squat','1-5-rep-lunge','kettlebell-reverse-lunge']) {
 const out=base+'/native/'+id,candidate=read(out+'/candidate.json'),report=read(out+'/verification.json'),poses=read(out+'/poses.json');
 assert.equal(report.poseSamples,481);assert.ok(report.alpha.all192FrameEdgesClear);assert.ok(report.playback.every(p=>p.playing&&p.seeking&&p.loop));
 for(const x of [...candidate.inputs,...candidate.outputs])assert.equal(sha(x.file),x.sha256);
 const planted=poses.filter(p=>id==='dumbbell-squat'||(p.frame>=72&&p.frame<=408));
 const kinematics={samples:481,loopPoseError:report.loopPoseError,
  plantedFrontAnkleDrift:Math.max(...poses.map(p=>dist(p.joints['foot.L'],poses[0].joints['foot.L']))),
  plantedRearContactDrift:Math.max(...planted.map(p=>dist(p.joints[id==='dumbbell-squat'?'foot.R':'toe2-1.R'],planted[0].joints[id==='dumbbell-squat'?'foot.R':'toe2-1.R']))),
  rearKneeMinY:Math.min(...poses.map(p=>p.joints['lowerleg01.R'][1]))};
 assert.ok(kinematics.plantedFrontAnkleDrift<1e-6&&kinematics.plantedRearContactDrift<1e-6);
 assert.ok(kinematics.rearKneeMinY>-7.35,'Rear knee remains above floor');
 if(id==='1-5-rep-lunge'){
  const hipY=f=>poses[f].joints['upperleg01.L'][1];
  kinematics.partialRise=hipY(240)-hipY(168);
  assert.ok(kinematics.partialRise>1.9&&kinematics.partialRise<2.1);
  assert.ok(Math.abs(hipY(168)-hipY(312))<1e-6,'Two bottom visits before standing');
 }
 if(id!=='dumbbell-squat'){
  kinematics.rearStepTravelZ=Math.min(...poses.map(p=>p.joints['foot.R'][2]-poses[0].joints['foot.R'][2]));
  assert.ok(kinematics.rearStepTravelZ<-7);
 }
 write(out+'/kinematics.json',kinematics);
 execFileSync(ff,['-v','error','-y','-i',out+'/full-sheet.png','-i',out+'/side-sheet.png','-filter_complex','[0:v][1:v]vstack,scale=960:960','-frames:v','1',out+'/source.jpg']);
 for(const suffix of ['','-dark'])execFileSync(ff,['-v','error','-y','-i',out+'/'+id+suffix+'.mp4','-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',out+'/final'+suffix+'.jpg']);
 const inputs=[...candidate.inputs.map(x=>({path:x.file,sha256:x.sha256})),...['source.json','verify.mjs','finalize.mjs'].map(f=>({path:base+'/'+f,sha256:sha(base+'/'+f)}))];
 const reference=read(base+'/source.json');
 write(out+'/provenance.json',{id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,timing:'continuous'},inputs:inputs.filter(x=>!x.path.startsWith('node_modules/')),dependencies:inputs.filter(x=>x.path.startsWith('node_modules/')),sourceUrls:[reference[id].url,...(reference[id].supportingUrl?[reference[id].supportingUrl]:[])],sourceSummary:reference[id].criteria,kinematics,verification:report,sourceContact:{path:out+'/source.jpg',sha256:sha(out+'/source.jpg'),panels:16},limitations:reference.limits});
 console.log(id,JSON.stringify(kinematics));
}
