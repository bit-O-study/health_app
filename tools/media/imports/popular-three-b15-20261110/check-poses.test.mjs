import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {checkPoses} from './check-poses.mjs';
for(const id of ['bulgarian-split-squat','one-arm-dumbbell-row','cable-fly']){
 const read=()=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
 test(id+' valid full cycle',()=>checkPoses(id,read()));
 test(id+' rejects broken loop',()=>{const p=read();p[480].joints.head[0]+=.2;assert.throws(()=>checkPoses(id,p));});
 test(id+' rejects sliding foot',()=>{const p=read();p[80].joints['foot.L'][0]+=.2;assert.throws(()=>checkPoses(id,p));});
 test(id+' rejects broken peak hold',()=>{const p=read();p[230].joints['wrist.L'][1]+=.1;assert.throws(()=>checkPoses(id,p));});
}
