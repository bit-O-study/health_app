import {readFileSync, writeFileSync, copyFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {checkPoses} from './check-poses.mjs';
const base='tools/media/imports/running-20261110';
const read=p=>JSON.parse(readFileSync(p));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.ok(!existsSync(base+'/published.json'),'Already published; do not overwrite backup');
const candidate=read(base+'/native/candidate.json');
const verification=read(base+'/native/verification.json');
const previous=read(base+'/previous.json');
const review=read(base+'/review.json');
assert.equal(review.technicalVisualReview,'passed');
assert.equal(verification.sourceHashChecks,'passed');
assert.equal(verification.poseSamples,481);
assert.equal(verification.alpha.all240FrameEdgesClear,true);
assert.equal(verification.playback.length,3);
for(const item of verification.playback) assert.ok(item.playing&&item.seeking&&item.loop&&item.duration===8);
checkPoses(read(base+'/native/poses.json'));
for(const item of [...candidate.inputs,...candidate.outputs]) assert.equal(hash(item.file),item.sha256);
for(const item of previous){assert.equal(hash(item.path),item.sha256);assert.equal(hash(item.backup),item.sha256);}
const outputs=candidate.outputs.map(item=>({...item,target:'public/exercise-guides/ai-v3/'+item.file.split('/').at(-1)}));
for(const item of outputs){
 const prior=previous.find(p=>p.path===item.target);
 assert.ok(prior);assert.notEqual(item.sha256,prior.sha256);
}
for(const item of outputs){copyFileSync(item.file,item.target);assert.equal(hash(item.target),item.sha256);}
writeFileSync(base+'/published.json',JSON.stringify({scope:'local-only',createdAt:new Date().toISOString(),userVisualAcceptance:'pending',previous,outputs},null,2)+'\n');
console.log('Three running encodings replaced locally; user review and deployment pending.');
