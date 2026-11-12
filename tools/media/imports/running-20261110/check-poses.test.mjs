import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {checkPoses} from './check-poses.mjs';
const read=()=>JSON.parse(readFileSync(new URL('./native/poses.json',import.meta.url)));
test('ten continuous alternating strides',()=>{const result=checkPoses(read());writeFileSync(new URL('./native/kinematics.json',import.meta.url),JSON.stringify(result,null,2));});
test('rejects broken cycle',()=>{const p=read();p[480].joints['foot.L'][1]+=.1;assert.throws(()=>checkPoses(p));});
test('rejects changed landing',()=>{const p=read();for(let i=0;i<481;i+=48)p[i].joints['foot.L'][1]+=.1;assert.throws(()=>checkPoses(p));});
test('rejects sliding speed change',()=>{const p=read();for(let i=6;i<481;i+=48)p[i].joints['foot.L'][2]+=.2;assert.throws(()=>checkPoses(p));});
