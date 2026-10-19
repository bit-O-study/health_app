import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { manageMotionGuides } from '../../manage-motion-guides.mjs';
const base='tools/media/imports/cardio-three-20261016',root='tools/media/motion-guides',pub='public/exercise-guides/ai-v3';
const read=f=>JSON.parse(readFileSync(f)),write=(f,o)=>writeFileSync(f,JSON.stringify(o,null,2)+'\n'),sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const source=read(base+'/source.json');
const reviewed=read(base+'/visual-review.json');
const jobs=['high-knees','butt-kicks','jumping-jack'].map(id=>{
 const out=base+'/native/'+id,candidate=read(out+'/candidate.json'),provenance=read(out+'/provenance.json'),report=read(out+'/verification.json');
 assert.equal(reviewed[id].status,'passed-isolated-candidate');
 for(const key of ['exercise','equipment','setup','hands','feet','movement'])assert.ok(reviewed[id].checks[key]?.trim());
 assert.ok(!existsSync(root+'/'+id+'.json')&&!existsSync(pub+'/'+id+'.mp4'),'Existing target '+id);
 for(const x of [...provenance.inputs,...provenance.dependencies])assert.equal(sha(x.path),x.sha256);
 for(const x of candidate.outputs)assert.equal(sha(x.file),x.sha256);
 assert.ok(report.alpha.all192FrameEdgesClear&&report.playback.length===3&&report.playback.every(p=>p.playing&&p.seeking&&p.loop));
 assert.equal(sha(out+'/source.jpg'),provenance.sourceContact.sha256);
 return {id,out,candidate,provenance};
});
for(const {id,out,candidate,provenance} of jobs){
 copyFileSync(out+'/source.jpg',root+'/'+id+'.jpg');copyFileSync(out+'/provenance.json',root+'/'+id+'-provenance.json');
 write(root+'/'+id+'.json',{id,equipment:'bodyweight',panels:16,cycle:'full',timing:'continuous',renderer:'skinned-pilot-v1',rigSource:id+'-provenance.json',cutout:true,sources:[source[id].url],sourceKind:'Diagnostic front/side contact sheet; procedural motion and character recorded in provenance',registeredAt:new Date().toISOString()});
 for(const x of candidate.outputs)copyFileSync(x.file,pub+'/'+x.file.split('/').at(-1));
 const light=candidate.outputs.find(x=>x.theme==='light'),dark=candidate.outputs.find(x=>x.theme==='dark');
 const entry={id,renderVersion:'skinned-pilot-v1',panels:16,cutout:true,sourceSha256:sha(root+'/'+id+'.jpg'),rigSourceSha256:sha(root+'/'+id+'-provenance.json'),videoSha256:light.sha256,darkVideoSha256:dark.sha256,width:480,height:480,fps:24,seconds:8,bytes:light.bytes,darkBytes:dark.bytes,decode:'passed',verifiedAt:new Date().toISOString()};
 write(root+'/verification.json',[...read(root+'/verification.json'),entry]);
 await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks:reviewed[id].checks,note:provenance.limitations})));
 write(out+'/published.json',entry);
}
