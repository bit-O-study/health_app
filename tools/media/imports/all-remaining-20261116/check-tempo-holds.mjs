import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/tempo-holds';
const {checkPoses}=await import('./tempo-holds/check-original.mjs');
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const e of JSON.parse(readFileSync(base+'/batch.json')).entries){
 const dir=base+'/native/'+e.id,poses=JSON.parse(readFileSync(dir+'/poses.json')),geometry=JSON.parse(readFileSync(dir+'/geometry.json'));let report;
 if(!e.hold){report=checkPoses(e.original,poses);for(let f=60;f<=120;f++)assert.deepEqual(poses[f].joints,poses[60].joints);for(let f=300;f<=480;f++)assert.deepEqual(poses[f].joints,poses[0].joints);}
 else {
  assert.equal(poses.length,481);for(const p of poses){assert.deepEqual(p.joints,poses[0].joints);assert.ok(Object.values(p.joints).flat(Infinity).every(Number.isFinite));}
  const j=poses[0].joints;let gripError=0;
  if(e.original==='pull-up'){assert.ok(j.head[1]>11.7);assert.ok(j.contacts[3]>0);for(const s of ['L','R'])gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));}
  else {for(let i=0;i<j.grips.length;i++)gripError=Math.max(gripError,dist(j.grips[i],j.targets[i]));for(const s of ['L','R']){const elbow=angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+s]));assert.ok(elbow>65&&elbow<100);assert.ok(angle(...['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+s]))>179.9);}for(const g of geometry){assert.ok(g.floorClearance>=-1e-5);assert.ok(g.cloth>-7.9);assert.ok(Math.abs(g.toeSupportGap)<.01);assert.ok(g.handSupportGap>=0&&g.handSupportGap<.04);}}
  assert.ok(gripError<1e-7);report={poseSamples:481,loopError:0,gripError,holdSeconds:8};
 }
 writeFileSync(dir+'/kinematics.json',JSON.stringify({status:'numeric-checks-passed',...report},null,2));console.log(e.id,report);
}
