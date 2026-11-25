import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/kneeling-curl',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json');let gripError=0,maxStep=0;const knees=[];
assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);
for(let f=0;f<=480;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const key of ['root','head','upperleg01.L','upperleg01.R','lowerleg01.L','lowerleg01.R','foot.L','toe2-1.L','wrist.L','wrist.R'])assert.deepEqual(j[key],p[0].joints[key]);for(const s of ['L','R'])gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));knees.push(angle(j['upperleg01.R'],j['lowerleg01.R'],j['foot.R']));assert.ok(Math.abs(angle(j['upperleg01.L'],j['lowerleg01.L'],j['foot.L'])-90)<1e-6);assert.ok(Math.abs(j.roller[1]-j.load[1])+Math.abs(j.roller[2]-j.load[2])<1e-10);if(f)maxStep=Math.max(maxStep,dist(j.roller,p[f-1].joints.roller));}
assert.ok(gripError<1e-7&&maxStep<.1);assert.ok(Math.abs(Math.min(...knees)-80)<1e-6&&Math.abs(Math.max(...knees)-180)<1e-6);
// The unsupported toes descend slightly as the ankle rotates; they must clear the base top at -8.825.
for(const x of g){assert.ok(Math.abs(x.leftGap-.015)<1e-6&&Math.abs(x.thighGap-.015)<1e-6);assert.ok(x.rollerGap>0&&x.rollerGap<.05);assert.ok(x.rightMin>-8.825);for(const gap of x.elbowGaps)assert.ok(Math.abs(gap-.015)<1e-6);}
const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,maxStep,kneeRange:[Math.min(...knees),Math.max(...knees)],supportSamples:g.length,supportKneeDegrees:90,elbowPads:2,rollerGapRange:[Math.min(...g.map(x=>x.rollerGap)),Math.max(...g.map(x=>x.rollerGap))],loadRise:p[240].joints.load[1]-p[0].joints.load[1]};assert.ok(result.loadRise>3);writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
