import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/cardio-three-20261016';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const read=f=>JSON.parse(readFileSync(f)),write=(f,o)=>writeFileSync(f,JSON.stringify(o,null,2)+'\n');
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0)/(Math.hypot(...a)*Math.hypot(...b)))))*180/Math.PI;
for(const id of ['high-knees','butt-kicks','jumping-jack']) {
 const out=base+'/native/'+id,candidate=read(out+'/candidate.json'),report=read(out+'/verification.json'),poses=read(out+'/poses.json');
 assert.equal(report.poseSamples,481);assert.ok(report.alpha.all192FrameEdgesClear);assert.ok(report.playback.every(p=>p.playing&&p.seeking&&p.loop));
 for(const x of [...candidate.inputs,...candidate.outputs])assert.equal(sha(x.file),x.sha256);
 const samples=poses.map(({joints:j})=>({hip:['L','R'].map(s=>angle(sub(j['lowerleg01.'+s],j['upperleg01.'+s]),[0,-1,0])),knee:['L','R'].map(s=>180-angle(sub(j['upperleg01.'+s],j['lowerleg01.'+s]),sub(j['foot.'+s],j['lowerleg01.'+s]))),footSpan:Math.abs(j['foot.L'][0]-j['foot.R'][0]),wristY:Math.min(j['wrist.L'][1],j['wrist.R'][1])}));
 const range=f=>[Math.min(...samples.flatMap(f)),Math.max(...samples.flatMap(f))];
 const kinematics={samples:481,hipDegrees:range(x=>x.hip),kneeFlexionDegrees:range(x=>x.knee),footSpan:range(x=>x.footSpan),wristY:range(x=>x.wristY),loopPoseError:report.loopPoseError};
 if(id==='high-knees'){assert.ok(kinematics.hipDegrees[1]>89.9);assert.ok(kinematics.kneeFlexionDegrees[1]>89.9);}
 if(id==='butt-kicks'){assert.ok(kinematics.hipDegrees[1]<.001);assert.ok(kinematics.kneeFlexionDegrees[1]>134.9);}
 if(id==='jumping-jack'){
  const model=read('tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/human.json');
  const headTop=model.bones.find(b=>b.name==='head').tail[1];
  assert.ok(kinematics.footSpan[1]>7);assert.ok(kinematics.wristY[1]>headTop);assert.ok(kinematics.kneeFlexionDegrees[0]>5);
 }
 write(out+'/kinematics.json',kinematics);
 execFileSync(ff,['-v','error','-y','-i',out+'/full-sheet.png','-i',out+'/side-sheet.png','-filter_complex','[0:v][1:v]vstack,scale=960:960','-frames:v','1',out+'/source.jpg']);
 for(const suffix of ['','-dark'])execFileSync(ff,['-v','error','-y','-i',out+'/'+id+suffix+'.mp4','-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',out+'/final'+suffix+'.jpg']);
 const inputs=[...candidate.inputs.map(x=>({path:x.file,sha256:x.sha256})),...['source.json','verify.mjs','finalize.mjs'].map(f=>({path:base+'/'+f,sha256:sha(base+'/'+f)}))];
 const reference=read(base+'/source.json');
 const provenance={id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,timing:'continuous'},inputs:inputs.filter(x=>!x.path.startsWith('node_modules/')),dependencies:inputs.filter(x=>x.path.startsWith('node_modules/')),sourceUrls:[reference[id].url],sourceSummary:reference[id].criteria,kinematics,verification:report,sourceContact:{path:out+'/source.jpg',sha256:sha(out+'/source.jpg'),panels:16},limitations:reference.limits+' Visual and joint checks do not constitute exhaustive continuous cloth/triangle collision simulation.'};
 write(out+'/provenance.json',provenance);
 console.log(id,JSON.stringify(kinematics));
}
