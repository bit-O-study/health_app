import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=["arnold-press","upright-row","close-grip-upright-row"];
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

test('Arnold press rotates from palms-in to palms-forward and extends overhead',()=>{
 const p=load('arnold-press');
 for(const [i,side] of ['L','R'].entries()){
  const sign=side==='L'?1:-1;
  assert.ok(sign*p[0].joints.handles[i][0]>.99);
  assert.ok(sign*p[210].joints.handles[i][0]<-.99);
  assert.ok(p[0].joints['lowerarm01.'+side][2]-p[0].joints['upperarm01.'+side][2]>1.5);
  assert.ok(p[210].joints['wrist.'+side][1]-p[210].joints['upperarm01.'+side][1]>4.8);
  assert.ok(p[105].joints.handles[i][2]>.8);
  assert.ok(p[420].joints.handles[i][0]*sign>.9);
 }
 for(let i=1;i<p.length;i++)for(const side of ['L','R'])assert.ok(distance(p[i].joints['wrist.'+side],p[i-1].joints['wrist.'+side])<.16);
});
test('upright rows lead with elbows without exceeding shoulder height',()=>{
 for(const id of ids.slice(1)){
  const p=load(id),top=p[210].joints;
  for(const side of ['L','R']){
   assert.ok(top['lowerarm01.'+side][1]>top['wrist.'+side][1]+.2);
   assert.ok(Math.abs(top['lowerarm01.'+side][0])>Math.abs(top['wrist.'+side][0])+.5);
   for(const {joints:j} of p)assert.ok(j['lowerarm01.'+side][1]<=j['upperarm01.'+side][1]);
  }
 }
});
test('narrow grip stays attached to one rigid bar with central body clearance',()=>{
 const p=load('close-grip-upright-row'),span=distance(...p[0].joints.grips);
 assert.ok(span>1.8&&span<2.4);
 for(const {joints:j} of p){
  assert.ok(Math.abs(distance(...j.grips)-span)<1e-8);
  assert.ok(Number.isFinite(j.centralClearance)&&j.centralClearance>.05);
  for(const [i,g] of j.grips.entries()){
   assert.ok(Math.hypot(g[1]-j.barCenter[1],g[2]-j.barCenter[2])<1e-8);
   assert.ok((i===0?-1:1)*j.handles[i][0]>.9999);
  }
 }
});
test('dumbbells remain separate and widen during the lift',()=>{
 const p=load('upright-row');
 assert.ok(distance(...p[210].joints.grips)>distance(...p[0].joints.grips)+.8);
 for(const {joints:j} of p)assert.ok(distance(...j.grips)>3.5);
});
