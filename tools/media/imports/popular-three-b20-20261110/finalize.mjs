import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { checkPoses } from './check-poses.mjs';
const base='tools/media/imports/popular-three-b20-20261110';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const read=f=>JSON.parse(readFileSync(f)),write=(f,o)=>writeFileSync(f,JSON.stringify(o,null,2)+'\n');
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
for(const id of ["low-bar-squat","cable-glute-kickback","band-good-morning"]){
 const out=base+'/native/'+id,candidate=read(out+'/candidate.json'),report=read(out+'/verification.json');
 assert.equal(report.poseSamples,481);assert.ok(report.alpha.all192FrameEdgesClear);
 assert.equal(report.playback.length,3);assert.ok(report.playback.every(x=>x.playing&&x.seeking&&x.loop));
 for(const x of [...candidate.inputs,...candidate.outputs])assert.equal(sha(x.file),x.sha256);
 const geometry=read(out+'/geometry.json');assert.equal(geometry.length,17);for(const g of geometry){assert.ok(g.gripError<1e-7);assert.ok(g.floorClearance>0);if(id==='low-bar-squat')assert.ok(Math.abs(g.barZ-.2)<1e-8);if(id==='cable-glute-kickback')assert.equal(g.cuffError,0);if(id==='band-good-morning')assert.ok(g.bandLength>30);if(id==='cable-glute-kickback')assert.ok(Math.abs(g.cableLength-geometry[0].cableLength)<1e-7);} const kinematics=checkPoses(id,read(out+'/poses.json'));kinematics.geometry={samples:17,report:out+'/geometry.json',limits:'Grip, foot clearance and cable length samples only, not all body collisions'};write(out+'/kinematics.json',kinematics);
 execFileSync(ff,['-v','error','-y','-i',out+'/full-sheet.png','-i',out+'/side-sheet.png','-filter_complex','[0:v][1:v]vstack,scale=960:960','-frames:v','1',out+'/source.jpg']);
 for(const suffix of ['','-dark'])execFileSync(ff,['-v','error','-y','-i',out+'/'+id+suffix+'.mp4','-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',out+'/final'+suffix+'.jpg']);
 const inputs=[...candidate.inputs.map(x=>({path:x.file,sha256:x.sha256})),...['source.json','verify.mjs','finalize.mjs','check-poses.mjs','inspect-geometry.mjs'].map(f=>({path:base+'/'+f,sha256:sha(base+'/'+f)}))];
 const source=read(base+'/source.json');
 write(out+'/provenance.json',{id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,timing:id==='plank'?'hold':'continuous'},inputs:inputs.filter(x=>!x.path.startsWith('node_modules/')),dependencies:inputs.filter(x=>x.path.startsWith('node_modules/')),sourceUrls:[source[id].url,source[id].supportingUrl].filter(Boolean),sourceSummary:source[id].criteria,geometry,kinematics,verification:report,sourceContact:{path:out+'/source.jpg',sha256:sha(out+'/source.jpg'),panels:16},limitations:source.limits});
 console.log(id,JSON.stringify(kinematics));
}
