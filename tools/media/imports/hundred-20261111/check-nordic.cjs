const fs=require('node:fs'),assert=require('node:assert/strict'),dir='tools/media/imports/hundred-20261111/native/nordic-hamstring-curl',read=f=>JSON.parse(fs.readFileSync(dir+'/'+f));
const p=read('poses.json'),g=read('geometry.json'),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);let supportDrift=0,maxStep=0;
for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const s of ['L','R'])for(const n of ['lowerleg01','foot'])supportDrift=Math.max(supportDrift,dist(j[n+'.'+s],p[0].joints[n+'.'+s]));if(i)for(const key of Object.keys(j))maxStep=Math.max(maxStep,dist(j[key],p[i-1].joints[key]));}
assert.ok(supportDrift<1e-5&&maxStep<.15);assert.ok(p[240].joints.head[2]-p[0].joints.head[2]>6);
assert.ok(g.every(x=>x.body>=-7.11&&x.knees>=-7.09&&x.knees+7.09<.08&&-5.87-x.ankleMax>0&&-5.87-x.ankleMax<.05));
const r={status:'numeric-checks-passed',poseSamples:481,supportDrift,maxStep,loopError:0,leanDegrees:45,kneeGap:Math.max(...g.map(x=>x.knees+7.09)),ankleGap:Math.max(...g.map(x=>-5.87-x.ankleMax))};fs.writeFileSync(dir+'/kinematics.json',JSON.stringify(r,null,2)+'\n');console.log(r);
