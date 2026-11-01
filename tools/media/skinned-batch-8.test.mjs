import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=["barbell-overhead-press","drag-curl","behind-the-back-shrug"];
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

for(const id of ids)test(id+': fixed rigid grip and central shaft clearance',()=>{
 const p=load(id),span=distance(...p[0].joints.grips);
 for(const {joints:j} of p){
  assert.ok(Math.abs(distance(...j.grips)-span)<1e-8);
  if(j.centralClearance!==null)assert.ok(j.centralClearance>.05,'Shaft intersects central body');
  for(const g of j.grips)assert.ok(Math.hypot(g[1]-j.barCenter[1],g[2]-j.barCenter[2])<1e-8);
 }
});
test('strict press clears the head and reaches almost straight arms overhead',()=>{
 const p=load(ids[0]),top=p[210].joints;
 assert.ok(top.barCenter[1]>12);
 assert.ok(Math.abs(top.barCenter[2])<1);
 for(const side of ['L','R']){
  const u=top['upperarm01.'+side],e=top['lowerarm01.'+side],w=top['wrist.'+side];
  assert.ok(distance(u,w)/(distance(u,e)+distance(e,w))>.98);
 }
 for(const {joints:j} of p)if(j.barCenter[1]<9.4)assert.ok(j.barCenter[2]>2.3);
});
test('drag curl brings elbows back and keeps the bar near the body',()=>{
 const p=load(ids[1]),a=p[0].joints,b=p[210].joints;
 for(const side of ['L','R'])assert.ok(b['lowerarm01.'+side][2]<a['lowerarm01.'+side][2]-.6);
 assert.ok(b.barCenter[1]-a.barCenter[1]>3.5);
 for(const {joints:j} of p){assert.ok(j.barCenter[2]<2.1);assert.ok(j.handles[0][0]>.99);}
});
test('behind-back shrug elevates shoulders with almost unchanged elbow angle',()=>{
 const p=load(ids[2]),a=p[0].joints,b=p[210].joints;
 const rise=b['upperarm01.L'][1]-a['upperarm01.L'][1];
 assert.ok(rise>.3&&rise<.7);
 assert.ok(Math.abs(b.barCenter[1]-a.barCenter[1]-rise)<.03);
 for(const {joints:j} of p){assert.ok(j.barCenter[2]<-1.5);assert.ok(Math.abs(j.barCenter[2]-a.barCenter[2])<.01);}
});
