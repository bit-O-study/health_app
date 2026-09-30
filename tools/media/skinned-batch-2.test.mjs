import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=['alternating-dumbbell-curl','cross-body-hammer-curl','dumbbell-reverse-curl','single-arm-dumbbell-shoulder-press'];
const load=id=>JSON.parse(readFileSync(`tools/media/motion-refresh/skinned-3d/${id}-poses.json`,'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const id of ids)test(id+': fixed arm lengths, feet and loop closure',()=>{
 const poses=load(id),start=poses[0].joints;
 for(const {joints:p} of poses)for(const side of ['L','R']){
  for(const [a,b] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']])assert.ok(Math.abs(distance(p[a+'.'+side],p[b+'.'+side])-distance(start[a+'.'+side],start[b+'.'+side]))<1e-7);
  assert.ok(distance(p['foot.'+side],start['foot.'+side])<1e-9);
 }
 assert.deepEqual(poses.at(-1).joints,start);
});
for(const id of ids.slice(0,2))test(id+': only one forearm curls at a time',()=>{
 const poses=load(id),start=poses[0].joints;
 for(const [frame,active,idle] of [[105,'L','R'],[345,'R','L']]){
  const peak=poses.find(p=>p.frame===frame).joints;
  assert.ok(peak['wrist.'+active][1]-start['wrist.'+active][1]>3);
  assert.ok(distance(peak['wrist.'+idle],start['wrist.'+idle])<1e-8);
 }
 for(const {joints:p} of poses)for(const side of ['L','R'])assert.ok(distance(p['lowerarm01.'+side],start['lowerarm01.'+side])<1e-8);
});
test('cross-body curl moves inward with a neutral handle',()=>{
 const poses=load(ids[1]),start=poses[0].joints;
 for(const [frame,side,index] of [[105,'L',0],[345,'R',1]]){
  const p=poses.find(p=>p.frame===frame).joints;
  assert.ok(Math.abs(p['wrist.'+side][0])<Math.abs(start['wrist.'+side][0])-1);
  // The knuckle line is oblique to the forearm: allow 15 degrees from
  // the neutral plane rather than requiring a world-axis-aligned handle.
  assert.ok(Math.abs(p.handles[index][0])<Math.sin(15*Math.PI/180));
  assert.ok(p.handles[index][1]>.85);
 }
});
test('reverse curl preserves pronated rather than supinated grip',()=>{
 // Overhand direction must oppose the underhand curl; the tilted knuckle
 // line and slightly outward upper arms allow up to 25 degrees of slope.
 const limit=Math.cos(25*Math.PI/180);
 for(const {joints:p} of load(ids[2])){assert.ok(p.handles[0][0]<-limit);assert.ok(p.handles[1][0]>limit);}
});
test('single-arm press reaches overhead with shoulder support and a still opposite arm',()=>{
 const poses=load(ids[3]),start=poses[0].joints,peak=poses.find(p=>p.frame===210).joints;
 assert.ok(peak['wrist.L'][1]-peak['upperarm01.L'][1]>5);
 assert.ok(peak['upperarm01.L'][1]>start['upperarm01.L'][1]);
 for(const {joints:p} of poses)assert.ok(distance(p['wrist.R'],start['wrist.R'])<1e-8);
});
