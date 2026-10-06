import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=['barbell-shrug','barbell-front-raise','barbell-upright-row','wide-grip-upright-row'];
const load=id=>JSON.parse(readFileSync(`tools/media/motion-refresh/skinned-3d/${id}-poses.json`,'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
for(const id of ids){
 test(id+': fixed limb lengths, planted feet and continuous rotations/loop',()=>{
  const poses=load(id),start=poses[0].joints;assert.equal(poses.length,481);
  for(const [index,{joints:p}] of poses.entries())for(const [i,side] of ['L','R'].entries()){
   for(const [a,b] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']])assert.ok(Math.abs(distance(p[a+'.'+side],p[b+'.'+side])-distance(start[a+'.'+side],start[b+'.'+side]))<1e-7);
   assert.ok(distance(p['foot.'+side],start['foot.'+side])<1e-9);
   if(index){
    assert.ok(2*Math.acos(Math.min(1,Math.abs(dot(p.forearmRotations[i],poses[index-1].joints.forearmRotations[i]))))<.15);
    assert.ok(distance(p['wrist.'+side],poses[index-1].joints['wrist.'+side])<.12);
   }
  }
  assert.deepEqual(poses.at(-1).joints,start);
 });
 test(id+': rigid horizontal bar, fixed grip spacing and central body clearance',()=>{
  const poses=load(id),span=distance(...poses[0].joints.grips);
  for(const {joints:p} of poses){
   assert.ok(Math.abs(distance(...p.grips)-span)<1e-8);
   assert.ok(Number.isFinite(p.centralClearance)&&p.centralClearance>.05,'Central shaft/body clearance: '+p.centralClearance);
   for(const [i,g] of p.grips.entries()){
    assert.ok(Math.hypot(g[1]-p.barCenter[1],g[2]-p.barCenter[2])<1e-8);
    assert.ok(Math.abs(g[0])<4.65);
    assert.ok((i===0?-1:1)*p.handles[i][0]>.9999);
   }
  }
 });
}
test('shrug elevates shoulders and bar together without a curl',()=>{
 const p=load(ids[0]),a=p[0].joints,b=p[210].joints;
 const elevation=b['upperarm01.L'][1]-a['upperarm01.L'][1];
 assert.ok(elevation>.3&&elevation<.8);
 assert.ok(Math.abs((b.barCenter[1]-a.barCenter[1])-elevation)<.08);
});
test('front raise reaches shoulder height with almost straight arms',()=>{
 const p=load(ids[1])[210].joints;
 assert.ok(Math.abs(p.barCenter[1]-p['upperarm01.L'][1])<.6);
 assert.ok(p.barCenter[2]-p['upperarm01.L'][2]>4.7);
});
test('upright rows lead with elbows and retain distinct grip widths',()=>{
 for(const id of ids.slice(2)){
  const p=load(id)[210].joints;
  assert.ok(p['lowerarm01.L'][1]>p['wrist.L'][1]+.3);
  assert.ok(p['lowerarm01.L'][0]>p['wrist.L'][0]+.5);
  assert.ok(p['lowerarm01.L'][1]<p['upperarm01.L'][1]+.2);
 }
 assert.ok(distance(...load(ids[3])[0].joints.grips)-distance(...load(ids[2])[0].joints.grips)>1.8);
});
