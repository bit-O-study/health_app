import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/hanging-twists',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json');let gripError=0,maxStep=0,upperDrift=0;const elbows=[],knees=[],twists=[];assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);
for(let f=0;f<p.length;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const key of ['head','wrist.L','wrist.R','upperarm01.L','upperarm01.R','lowerarm01.L','lowerarm01.R'])upperDrift=Math.max(upperDrift,dist(j[key],p[0].joints[key]));
for(const s of ['L','R']){gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));elbows.push(angle(j['upperarm01.'+s],j['lowerarm01.'+s],j['wrist.'+s]));knees.push(angle(j['upperleg01.'+s],j['lowerleg01.'+s],j['foot.'+s]));if(f)maxStep=Math.max(maxStep,dist(j['foot.'+s],p[f-1].joints['foot.'+s]));}
const l=j['upperleg01.L'],r=j['upperleg01.R'];twists.push(Math.atan2(r[2]-l[2],l[0]-r[0])*180/Math.PI);
}
assert.ok(gripError<1e-7&&upperDrift<1e-7&&maxStep<.2);assert.ok(elbows.every(a=>Math.abs(a-179)<1e-6));assert.ok(Math.min(...knees)>89&&Math.min(...knees)<91&&Math.max(...knees)>179.99);assert.ok(Math.abs(Math.min(...twists)+25)<1e-6&&Math.abs(Math.max(...twists)-25)<1e-6);
for(const f of [120,360])for(const s of ['L','R'])assert.ok(Math.abs(p[f].joints['lowerleg01.'+s][1]-p[f].joints['upperleg01.'+s][1])<1e-7);for(const x of g)assert.ok(x.floorClearance>1&&x.barClearance>.1);
const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,maxStep,upperDrift,elbowRange:[Math.min(...elbows),Math.max(...elbows)],kneeRange:[Math.min(...knees),Math.max(...knees)],pelvicTwistRange:[Math.min(...twists),Math.max(...twists)],minimumFloorClearance:Math.min(...g.map(x=>x.floorClearance))};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
