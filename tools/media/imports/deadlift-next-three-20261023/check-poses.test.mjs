import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkPoses } from './check-poses.mjs';
const read=id=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
for(const id of ['dumbbell-deadlift','single-arm-dumbbell-deadlift','partial-deadlift']){
 test(id+' keeps feet planted and range/equipment distinct',()=>{console.log(id,checkPoses(id,read(id)));});
}
test('rejects floor penetration and foot drift',()=>{
 const poses=read('dumbbell-deadlift');
 poses[120].joints.dumbbellMetrics[1]=poses[120].joints.contactMetrics[0]-.1;
 assert.throws(()=>checkPoses('dumbbell-deadlift',poses));
 const moved=read('dumbbell-deadlift');moved[120].joints['foot.L'][0]+=.1;
 assert.throws(()=>checkPoses('dumbbell-deadlift',moved));
});
test('rejects an extra dumbbell and a low partial starting height',()=>{
 const extra=read('single-arm-dumbbell-deadlift');extra[120].joints.dumbbellMetrics[0]=2;
 assert.throws(()=>checkPoses('single-arm-dumbbell-deadlift',extra));
 const low=read('partial-deadlift');low[0].joints.barPosition[1]=low[0].joints['lowerleg01.L'][1]-1;
 low.at(-1).joints=structuredClone(low[0].joints);
 assert.throws(()=>checkPoses('partial-deadlift',low));
});
