import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=['zottman-curl','wide-dumbbell-curl','scaption','alternating-dumbbell-front-raise'];
const load=id=>JSON.parse(readFileSync(`tools/media/motion-refresh/skinned-3d/${id}-poses.json`,'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
for(const id of ids)test(id+': every frame preserves arm lengths, feet and continuous forearm rotation',()=>{
 const poses=load(id),start=poses[0].joints;assert.equal(poses.length,481);
 for(const [index,{joints:p}] of poses.entries())for(const [sideIndex,side] of ['L','R'].entries()){
  for(const [a,b] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']])assert.ok(Math.abs(distance(p[a+'.'+side],p[b+'.'+side])-distance(start[a+'.'+side],start[b+'.'+side]))<1e-7);
  assert.ok(distance(p['foot.'+side],start['foot.'+side])<1e-9);
  if(index){
   const previous=poses[index-1].joints;
   assert.ok(2*Math.acos(Math.min(1,Math.abs(dot(p.forearmRotations[sideIndex],previous.forearmRotations[sideIndex]))))<.15,'Forearm rotation discontinuity at '+index);
   assert.ok(distance(p.handles[sideIndex],previous.handles[sideIndex])<.2,'Handle discontinuity at '+index);
  }
 }
 assert.deepEqual(poses.at(-1).joints,start);
});
test('Zottman turns at the top, lowers pronated, and resets after lowering',()=>{
 const p=load(ids[0]);
 assert.ok(p[160].joints.handles[0][0]>.9);
 assert.ok(p[235].joints.handles[0][0]<-.9);
 assert.ok(p[360].joints.handles[0][0]<-.9);
 assert.ok(p[479].joints.handles[0][0]>.9);
 assert.ok(distance(p[168].joints['wrist.L'],p[225].joints['wrist.L'])<1e-8);
});
test('wide curl moves outside the elbows without moving the upper arms',()=>{
 const p=load(ids[1]),start=p[0].joints,peak=p[210].joints;
 assert.ok(peak['wrist.L'][0]-peak['lowerarm01.L'][0]>1.5);
 assert.ok(peak['lowerarm01.R'][0]-peak['wrist.R'][0]>1.5);
 for(const {joints:j} of p)for(const side of ['L','R'])assert.ok(distance(j['lowerarm01.'+side],start['lowerarm01.'+side])<1e-8);
});
test('scaption raises in the forward diagonal plane with thumbs up below shoulder height',()=>{
 const p=load(ids[2])[210].joints;
 for(const [i,side] of ['L','R'].entries()){
  const w=p['wrist.'+side],s=p['upperarm01.'+side];
  const angle=Math.atan2(w[2]-s[2],Math.abs(w[0]-s[0]))*180/Math.PI;
  assert.ok(angle>=30&&angle<=45);assert.ok(w[1]<=s[1]);
  assert.ok(p.handles[i][1]>.9);
 }
});
test('alternating front raise moves one arm forward at a time',()=>{
 const p=load(ids[3]),start=p[0].joints;
 for(const [frame,active,idle] of [[105,'L','R'],[345,'R','L']]){
  const j=p[frame].joints;
  assert.ok(j['wrist.'+active][2]-j['upperarm01.'+active][2]>4.5);
  assert.ok(j['wrist.'+active][1]<=j['upperarm01.'+active][1]);
  assert.ok(distance(j['wrist.'+idle],start['wrist.'+idle])<1e-8);
 }
});
