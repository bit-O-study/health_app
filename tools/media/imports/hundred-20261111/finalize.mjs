import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/hundred-20261111';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const read=f=>JSON.parse(readFileSync(f)),sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
for(const entry of read(base+'/batch.json').entries.filter(e=>e.status==='awaiting-final-review')){
 const id=entry.id,out=base+'/native/'+id,candidate=read(out+'/candidate.json'),report=read(out+'/verification.json');
 assert.equal(report.poseSamples,481);assert.ok(report.alpha.all192FrameEdgesClear);
 assert.equal(report.playback.length,3);assert.ok(report.playback.every(x=>x.playing&&x.seeking&&x.loop));
 for(const item of [...candidate.inputs,...candidate.outputs])assert.equal(sha(item.file),item.sha256);
 assert.equal(entry.numericChecks,'passed');
 execFileSync(ff,['-v','error','-y','-i',out+'/full-sheet.png','-i',out+'/side-sheet.png','-filter_complex','[0:v][1:v]vstack,scale=960:960','-frames:v','1',out+'/source.jpg'],{windowsHide:true});
 for(const suffix of ['','-dark'])execFileSync(ff,['-v','error','-y','-i',out+'/'+id+suffix+'.mp4','-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',out+'/final'+suffix+'.jpg'],{windowsHide:true});
 const inputs=candidate.inputs.map(x=>({path:x.file,sha256:x.sha256}));
 const provenance={id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,timing:'continuous'},inputs:inputs.filter(x=>!x.path.startsWith('node_modules/')),dependencies:inputs.filter(x=>x.path.startsWith('node_modules/')),recipe:entry.recipe,geometry:read(out+'/geometry.json'),kinematics:read(out+'/kinematics.json'),verification:report,sourceContact:{path:out+'/source.jpg',sha256:sha(out+'/source.jpg'),panels:16},status:'awaiting-final-visual-review',limitations:'Procedural animation; sampled geometry checks, not full mesh collision or biomechanical validation.'};
 writeFileSync(out+'/provenance.json',JSON.stringify(provenance,null,2));console.log(id+': final contact sheets ready');
}
