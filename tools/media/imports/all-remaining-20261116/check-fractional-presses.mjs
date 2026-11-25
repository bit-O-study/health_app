import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/fractional-presses',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json'),bench=e.original==='bench-press';let gripError=0,supportDrift=0,maxStep=0;
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);
 for(let f=0;f<=480;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const s of ['L','R'])supportDrift=Math.max(supportDrift,dist(j['foot.'+s],p[0].joints['foot.'+s]));if(f)maxStep=Math.max(maxStep,dist(j.barCenter,p[f-1].joints.barCenter));
  if(bench){gripError=Math.max(gripError,j.barGripPlaneError,Math.abs(j.gripSpan-6.2));assert.ok(j.equipmentNonChestClearance>.02&&j.chestClearance>-.01&&j.headClearance>.1&&j.backContactError<.05&&j.headSupportError<1e-6&&j.equipmentBenchClearance>0&&j.equipmentBackPadClearance>0&&j.wristDeviation.every(x=>x<35));}
 }
 assert.ok(supportDrift<1e-6&&maxStep<.12&&gripError<1e-6);
 if(!bench)assert.ok(g.every(x=>x.equipmentBodyClearance>.05&&Math.abs(x.bodyFloorGap)<1e-6&&Math.abs(x.heelFloorGap)<1e-6&&x.barGripError<1e-6&&Math.abs(x.gripSpan-7.4)<1e-6));
 const targetFrames=bench?[0,120,180,240,420,480]:[0,90,180,330,480],fractions=bench?[1,0,.25,0,1,1]:[0,.5,0,1,0],bottom=Math.min(...p.map(x=>x.joints.barCenter[1])),top=Math.max(...p.map(x=>x.joints.barCenter[1]));assert.ok(top-bottom>(bench?4:5.8));
 for(let i=0;i<targetFrames.length;i++){const actual=(p[targetFrames[i]].joints.barCenter[1]-bottom)/(top-bottom);assert.ok(Math.abs(actual-fractions[i])<.04,'Fraction mismatch '+actual);}
 const report={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,supportDrift,maxStep,targetFrames,fractions,supportSamples:g.length};writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(e.id,report);
}
