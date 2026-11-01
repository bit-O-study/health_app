import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
export function checkPoses(id,poses){
 assert.equal(poses.length,481);
 assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 const j=(p,n)=>p.joints[n],distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 const range=values=>[Math.min(...values),Math.max(...values)];
 const angle=(p,a,b,c)=>{
  const u=j(p,a).map((x,i)=>x-j(p,b)[i]),v=j(p,c).map((x,i)=>x-j(p,b)[i]);
  return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;
 };
 const report={samples:481,loopError:0};
 const elbows=poses.flatMap(p=>['L','R'].map(s=>angle(p,'upperarm01.'+s,'lowerarm01.'+s,'wrist.'+s)));
 report.elbowRange=range(elbows);
 if(id!=='eccentric-calf-raise'){
  assert.ok(elbows.every(x=>x>160&&x<180),'Trap bar arms remain long');
  report.gripMisalignment=Math.max(...poses.map(p=>Math.hypot(j(p,'grip.0')[1]-j(p,'grip.1')[1],j(p,'grip.0')[2]-j(p,'grip.1')[2])));
  report.handleWidthDrift=Math.max(...poses.map(p=>Math.abs(j(p,'grip.0')[0]-j(p,'grip.1')[0]-2*j(p,'trapMetrics')[0])));
  report.bodyFrameVertexClearance=Math.min(...poses.map(p=>j(p,'bodyFrameClearance')[0]));
  assert.ok(report.gripMisalignment<1e-6&&report.handleWidthDrift<1e-6);
  assert.ok(report.bodyFrameVertexClearance>.1,'Sampled torso/legs must clear the frame');
  assert.ok(poses.every(p=>[0,1].every(i=>Math.abs(j(p,'gripAxis.'+i)[2])>.999)));
 }else{
  report.supportHandDrift=Math.max(...poses.flatMap(p=>[0,1].map(i=>distance(j(p,'grip.'+i),j(poses[0],'grip.'+i)))));
  assert.ok(report.supportHandDrift<1e-6);
  for(const [i,x]of [[0,2.8],[1,-2.8]])assert.ok(distance(j(poses[0],'grip.'+i),[x,3,5])<1e-6);
 }
 if(id==='trap-bar-romanian-deadlift'){
  report.footDrift=Math.max(...poses.flatMap(p=>['L','R'].map(s=>distance(j(p,'foot.'+s),j(poses[0],'foot.'+s)))));
  report.kneeRange=range(poses.flatMap(p=>['L','R'].map(s=>angle(p,'upperleg01.'+s,'lowerleg01.'+s,'foot.'+s))));
  report.hipBackward=j(poses[0],'upperleg01.L')[2]-j(poses[240],'upperleg01.L')[2];
  assert.ok(report.footDrift<1e-6&&report.kneeRange.every(x=>Math.abs(x-155)<1e-6)&&report.hipBackward>2.5);
 }else{
  report.supportClearanceRange=range(poses.map(p=>j(p,'supportMetrics')[0]));
  report.heelYRange=range(poses.map(p=>j(p,'supportMetrics')[1]));
  report.heelMaximumZ=Math.max(...poses.map(p=>j(p,'supportMetrics')[2]));
  report.toeHorizontalDrift=Math.max(...poses.flatMap(p=>['L','R'].map(s=>Math.hypot(j(p,'toe2-1.'+s)[0]-j(poses[0],'toe2-1.'+s)[0],j(p,'toe2-1.'+s)[2]-j(poses[0],'toe2-1.'+s)[2]))));
  assert.ok(report.supportClearanceRange.every(x=>Math.abs(x)<1e-6)&&report.toeHorizontalDrift<1e-6);
  assert.ok(report.heelYRange[0]<-8.3&&report.heelYRange[1]>-7.6&&report.heelMaximumZ<1.45);
  const start=id==='eccentric-calf-raise'?120:240,end=456;
  for(let n=start+1;n<=end;n++)assert.ok(j(poses[n],'supportMetrics')[1]<=j(poses[n-1],'supportMetrics')[1]+1e-6,'Controlled lowering');
  report.tempoSeconds=id==='eccentric-calf-raise'?{up:1.6,top:.4,down:5.6,bottom:.4}:{up:3.2,top:.8,down:3.6,bottom:.4};
 }
 return report;
}
if(process.argv[2]){
 const id=process.argv[2],base='tools/media/imports/trap-calf-three-20261020/native/'+id;
 const report=checkPoses(id,JSON.parse(readFileSync(base+'/poses.json')));
 writeFileSync(base+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({id,...report}));
}
