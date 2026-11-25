import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='tools/media/imports/all-remaining-20261116/dead-hang/native/dead-hang',read=p=>JSON.parse(readFileSync(p)),p=read(dir+'/poses.json'),g=read(dir+'/geometry.json'),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
let gripError=0;const elbows=[];assert.equal(p.length,481);
for(const {joints:j}of p){assert.deepEqual(j,p[0].joints);assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const s of ['L','R']){gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));elbows.push(angle(j['upperarm01.'+s],j['lowerarm01.'+s],j['wrist.'+s]));}}
assert.ok(gripError<1e-7);assert.ok(elbows.every(a=>Math.abs(a-179)<1e-6));for(const x of g){assert.ok(x.floorClearance>1&&x.barClearance>.1);}
const result={status:'numeric-checks-passed',poseSamples:481,staticPose:true,loopError:0,gripError,elbowRange:[Math.min(...elbows),Math.max(...elbows)],minimumFloorClearance:Math.min(...g.map(x=>x.floorClearance)),minimumBarClearance:Math.min(...g.map(x=>x.barClearance))};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(result);
