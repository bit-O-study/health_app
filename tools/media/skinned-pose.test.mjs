import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const poses=JSON.parse(readFileSync('tools/media/motion-refresh/skinned-3d/pose-checks.json','utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
test('arm segments keep their lengths through ascent, peak, descent and loop',()=>{
 for(const side of ['L','R'])for(const [a,b] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']]){
  const baseline=distance(poses[0].joints[a+'.'+side],poses[0].joints[b+'.'+side]);
  for(const pose of poses)assert.ok(Math.abs(distance(pose.joints[a+'.'+side],pose.joints[b+'.'+side])-baseline)<1e-7);
 }
});
test('both feet remain planted at their rest coordinates',()=>{
 for(const pose of poses)for(const side of ['L','R'])assert.ok(distance(pose.joints['foot.'+side],poses[0].joints['foot.'+side])<1e-9);
});
test('peak elbows reach shoulder level, with wrists no higher than elbows',()=>{
 const {joints}=poses.find(p=>p.frame===210);
 for(const side of ['L','R']){
  assert.ok(Math.abs(joints['upperarm01.'+side][1]-joints['lowerarm01.'+side][1])<.15);
  assert.ok(joints['wrist.'+side][1]<=joints['lowerarm01.'+side][1]+.01);
 }
});
test('cycle endpoint returns to the exact starting joint pose',()=>{
 assert.deepEqual(poses.find(p=>p.frame===480).joints,poses[0].joints);
});
