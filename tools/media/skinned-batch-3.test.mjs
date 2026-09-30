import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=['dumbbell-shoulder-press','alternating-dumbbell-shoulder-press','single-arm-dumbbell-front-raise','single-arm-dumbbell-lateral-raise'];
const load=id=>JSON.parse(readFileSync(`tools/media/motion-refresh/skinned-3d/${id}-poses.json`,'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const id of ids)test(id+': fixed arm lengths, planted feet and closed loop',()=>{
 const poses=load(id),start=poses[0].joints;
 for(const {joints:p} of poses)for(const side of ['L','R']){
  for(const [a,b] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']])assert.ok(Math.abs(distance(p[a+'.'+side],p[b+'.'+side])-distance(start[a+'.'+side],start[b+'.'+side]))<1e-7);
  assert.ok(distance(p['foot.'+side],start['foot.'+side])<1e-9);
 }
 assert.deepEqual(poses.at(-1).joints,start);
});
test('bilateral press lifts both hands overhead with shoulder support',()=>{
 const poses=load(ids[0]),start=poses[0].joints,peak=poses.find(p=>p.frame===210).joints;
 for(const side of ['L','R']){
  assert.ok(peak['wrist.'+side][1]-peak['upperarm01.'+side][1]>5);
  assert.ok(peak['upperarm01.'+side][1]>start['upperarm01.'+side][1]);
 }
 for(const {joints:p} of poses)assert.ok(Math.abs(p['wrist.L'][1]-p['wrist.R'][1])<1e-6);
});
test('alternating press leaves the opposite hand in its shoulder-height rack',()=>{
 const poses=load(ids[1]),start=poses[0].joints;
 for(const [frame,active,idle] of [[105,'L','R'],[345,'R','L']]){
  const p=poses.find(p=>p.frame===frame).joints;
  assert.ok(p['wrist.'+active][1]-start['wrist.'+active][1]>3);
  assert.ok(distance(p['wrist.'+idle],start['wrist.'+idle])<1e-8);
 }
});
for(const id of ids.slice(2))test(id+': resting arm stays still and raised wrist stays at or below shoulder',()=>{
 const poses=load(id),start=poses[0].joints;
 for(const {joints:p} of poses){
  assert.ok(distance(p['wrist.R'],start['wrist.R'])<1e-8);
  assert.ok(p['wrist.L'][1]<=p['upperarm01.L'][1]);
 }
});
test('front raise travels forward while lateral raise travels sideways',()=>{
 const front=load(ids[2]).find(p=>p.frame===210).joints,lateral=load(ids[3]).find(p=>p.frame===210).joints;
 assert.ok(front['wrist.L'][2]-front['upperarm01.L'][2]>4.5);
 assert.ok(lateral['wrist.L'][0]-lateral['upperarm01.L'][0]>4.5);
 assert.ok(Math.abs(lateral['wrist.L'][2]-lateral['upperarm01.L'][2])<1);
});
