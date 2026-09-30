import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=['barbell-curl','reverse-barbell-curl','wide-grip-barbell-curl','close-grip-barbell-curl'];
const load=id=>JSON.parse(readFileSync(`tools/media/motion-refresh/skinned-3d/${id}-poses.json`,'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
for(const id of ids){
 test(id+': fixed limbs, elbows, feet and continuous loop across all frames',()=>{
  const poses=load(id),start=poses[0].joints;assert.equal(poses.length,481);
  for(const [index,{joints:p}] of poses.entries())for(const [i,side] of ['L','R'].entries()){
   for(const [a,b] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']])assert.ok(Math.abs(distance(p[a+'.'+side],p[b+'.'+side])-distance(start[a+'.'+side],start[b+'.'+side]))<1e-7);
   for(const name of ['foot.','lowerarm01.'])assert.ok(distance(p[name+side],start[name+side])<1e-9);
   if(index)assert.ok(2*Math.acos(Math.min(1,Math.abs(dot(p.forearmRotations[i],poses[index-1].joints.forearmRotations[i]))))<.15);
  }
  assert.deepEqual(poses.at(-1).joints,start);
 });
 test(id+': both grips remain on the rigid shaft with fixed spacing and body clearance',()=>{
  const poses=load(id),span=distance(...poses[0].joints.grips);
  for(const {joints:p} of poses){
   assert.ok(Math.abs(distance(...p.grips)-span)<1e-8);
   assert.ok(Number.isFinite(p.centralClearance)&&p.centralClearance>.05,'Shaft intersects torso or garment');
   for(const [i,g] of p.grips.entries()){
    assert.ok(Math.hypot(g[1]-p.barCenter[1],g[2]-p.barCenter[2])<1e-8);
    assert.ok(Math.abs(g[0])<4.65,'Grip overlaps sleeve or plates');
    assert.ok(Math.abs(p.handles[i][0])>.9999,'Knuckles must align with bar');
   }
  }
 });
}
test('wide and close grips differ from standard by meaningful fixed distances',()=>{
 const span=id=>distance(...load(id)[0].joints.grips);
 assert.ok(span(ids[2])-span(ids[0])>1.5);
 assert.ok(span(ids[0])-span(ids[3])>1.5);
});
test('reverse curl keeps overhand grip opposite to the three supinated curls',()=>{
 for(const id of ids)for(const {joints:p} of load(id)){
  const sign=id==='reverse-barbell-curl'?-1:1;
  assert.ok(sign*p.handles[0][0]>.9999);assert.ok(-sign*p.handles[1][0]>.9999);
 }
});
