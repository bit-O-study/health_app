import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
const read=id=>JSON.parse(readFileSync(new URL(`./native/${id}/poses.json`,import.meta.url)));
for(const id of ['clean-grip-deadlift','snatch-grip-deadlift','axle-bar-deadlift'])test(id,()=>console.log(id,checkPoses(id,read(id))));
test('rejects foot sliding and floor penetration',()=>{
  const p=read('clean-grip-deadlift');p[100].joints['foot.L'][0]+=.1;assert.throws(()=>checkPoses('clean-grip-deadlift',p));
  const q=read('clean-grip-deadlift');q[100].joints.contactMetrics[1]=-20;assert.throws(()=>checkPoses('clean-grip-deadlift',q));
});
test('rejects narrow snatch grip and thin axle',()=>{
  assert.throws(()=>checkPoses('snatch-grip-deadlift',read('clean-grip-deadlift')));
  assert.throws(()=>checkPoses('axle-bar-deadlift',read('clean-grip-deadlift')));
});
