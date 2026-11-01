import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/directional-three-20261019';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const read=f=>JSON.parse(readFileSync(f)),write=(f,o)=>writeFileSync(f,JSON.stringify(o,null,2)+'\n');
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const id of ['side-lunge','dumbbell-jump-squat','kettlebell-lunge']) {
 const out=base+'/native/'+id,candidate=read(out+'/candidate.json'),report=read(out+'/verification.json'),poses=read(out+'/poses.json');
 assert.equal(report.poseSamples,481);assert.ok(report.alpha.all192FrameEdgesClear);assert.ok(report.playback.every(p=>p.playing&&p.seeking&&p.loop));
 for(const x of [...candidate.inputs,...candidate.outputs])assert.equal(sha(x.file),x.sha256);

 const joint=(p,n)=>p.joints[n];
 const drift=(samples,n)=>Math.max(...samples.map(p=>dist(joint(p,n),joint(samples[0],n))));
 const angle=(p,side)=>{const a=joint(p,'upperleg01.'+side),b=joint(p,'lowerleg01.'+side),c=joint(p,'foot.'+side),u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((sum,x,i)=>sum+x*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;};
 const planted=poses.filter(p=>p.frame>=96&&p.frame<=384);
 const kinematics={samples:481,loopPoseError:report.loopPoseError};
 if(id==='side-lunge'){
  kinematics.supportAnkleDrift=drift(poses,'foot.R');kinematics.loadedAnkleDrift=drift(planted,'foot.L');
  kinematics.lateralTravel=joint(poses[240],'foot.L')[0]-joint(poses[0],'foot.L')[0];
  kinematics.trailingKnee=angle(poses[240],'R');kinematics.loadedKnee=angle(poses[240],'L');
  assert.ok(kinematics.supportAnkleDrift<1e-6&&kinematics.loadedAnkleDrift<1e-6);
  assert.ok(kinematics.lateralTravel>6&&kinematics.trailingKnee>165&&kinematics.loadedKnee<130);
 }else if(id==='kettlebell-lunge'){
  kinematics.rearToeDrift=drift(poses,'toe2-1.R');kinematics.loadedAnkleDrift=drift(planted,'foot.L');
  kinematics.forwardTravel=joint(poses[240],'foot.L')[2]-joint(poses[0],'foot.L')[2];
  kinematics.rearKneeMinY=Math.min(...poses.map(p=>joint(p,'lowerleg01.R')[1]));
  assert.ok(kinematics.rearToeDrift<1e-6&&kinematics.loadedAnkleDrift<1e-6&&kinematics.forwardTravel>8&&kinematics.rearKneeMinY>-7.35);
 }else{
  const ground=poses.filter(p=>p.frame<=153||p.frame>=327);
  kinematics.groundAnkleDrift=Math.max(drift(ground,'foot.L'),drift(ground,'foot.R'));
  kinematics.jumpToeRise=Math.max(...poses.map(p=>joint(p,'toe2-1.L')[1]-joint(poses[0],'toe2-1.L')[1]));
  kinematics.symmetricRise=Math.max(...poses.map(p=>Math.abs(joint(p,'foot.L')[1]-joint(p,'foot.R')[1])));
  kinematics.landingKnee=angle(poses[350],'L');kinematics.takeoffKnee=angle(poses[202],'L');
  assert.ok(kinematics.groundAnkleDrift<1e-6&&kinematics.jumpToeRise>1.4&&kinematics.symmetricRise<1e-6);
  assert.ok(kinematics.takeoffKnee-kinematics.landingKnee>30,'Landing absorbs through flexion');
 }
 write(out+'/kinematics.json',kinematics);
 execFileSync(ff,['-v','error','-y','-i',out+'/full-sheet.png','-i',out+'/side-sheet.png','-filter_complex','[0:v][1:v]vstack,scale=960:960','-frames:v','1',out+'/source.jpg']);
 for(const suffix of ['','-dark'])execFileSync(ff,['-v','error','-y','-i',out+'/'+id+suffix+'.mp4','-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',out+'/final'+suffix+'.jpg']);
 const inputs=[...candidate.inputs.map(x=>({path:x.file,sha256:x.sha256})),...['source.json','verify.mjs','finalize.mjs'].map(f=>({path:base+'/'+f,sha256:sha(base+'/'+f)}))];
 const reference=read(base+'/source.json');
 write(out+'/provenance.json',{id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,timing:'continuous'},inputs:inputs.filter(x=>!x.path.startsWith('node_modules/')),dependencies:inputs.filter(x=>x.path.startsWith('node_modules/')),sourceUrls:[reference[id].url,...(reference[id].supportingUrl?[reference[id].supportingUrl]:[])],sourceSummary:reference[id].criteria,kinematics,verification:report,sourceContact:{path:out+'/source.jpg',sha256:sha(out+'/source.jpg'),panels:16},limitations:reference.limits});
 console.log(id,JSON.stringify(kinematics));
}
