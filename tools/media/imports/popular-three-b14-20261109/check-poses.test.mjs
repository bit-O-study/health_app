import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {checkPoses} from './check-poses.mjs';
for(const id of ['chin-up','wide-grip-pull-up','smith-bench-press']){
 const read=()=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
 test(id+' complete motion',()=>checkPoses(id,read()));
 test(id+' detects leg movement',()=>{const p=read();p[100].joints['foot.L'][0]+=.1;assert.throws(()=>checkPoses(id,p),/Leg movement/);});
 test(id+' detects broken loop',()=>{const p=read();p[480].joints.root[1]+=.1;assert.throws(()=>checkPoses(id,p));});
 test(id+' detects detached grip',()=>{const p=read();p[100].joints.grips[0][2]+=.1;assert.throws(()=>checkPoses(id,p),/Hand slides|vertical rail/);});
}
