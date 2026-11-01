import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
export function checkPoses(id,poses){
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 const j=(n,k)=>poses[n].joints[k],dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 const range=a=>[Math.min(...a),Math.max(...a)];
 const report={samples:481,loopError:0,
  footDrift:Math.max(...poses.flatMap((_,n)=>['L','R'].map(s=>dist(j(n,'foot.'+s),j(0,'foot.'+s))))),
  gripAlignment:Math.max(...poses.map((_,n)=>Math.hypot(j(n,'grip.0')[1]-j(n,'grip.1')[1],j(n,'grip.0')[2]-j(n,'grip.1')[2]))),
  bodyShaftClearance:Math.min(...poses.map((_,n)=>j(n,'contactMetrics')[2])),
  plateFloorClearance:range(poses.map((_,n)=>j(n,'contactMetrics')[1]-j(n,'contactMetrics')[0]))
 };
 assert.ok(report.footDrift<1e-6&&report.gripAlignment<1e-6&&report.bodyShaftClearance>.02);
 assert.ok(report.plateFloorClearance[0]>-1e-6);
 assert.ok(poses.every(p=>[0,1].every(i=>Math.abs(p.joints['gripAxis.'+i][0])>.999)));
 const hold=id==='isometric-deadlift-hold',top=hold?96:192,down=hold?336:240,end=hold?456:432;
 for(let n=1;n<=top;n++)assert.ok(j(n,'barPosition')[1]>=j(n-1,'barPosition')[1]-1e-6);
 for(let n=down+1;n<=end;n++)assert.ok(j(n,'barPosition')[1]<=j(n-1,'barPosition')[1]+1e-6);
 if(hold){
  report.holdSeconds=4;
  report.holdDrift=Math.max(...poses.slice(top,down+1).map(p=>dist(p.joints.barPosition,j(top,'barPosition'))));
  report.holdBelowKnee=j(top,'lowerleg01.L')[1]-j(top,'barPosition')[1];
  assert.ok(report.holdDrift<1e-6&&report.holdBelowKnee>.5);
  assert.ok(Math.abs(report.plateFloorClearance[0])<1e-6&&report.plateFloorClearance[1]>1);
 }else{
  report.supportGapRange=range(poses.map((_,n)=>j(n,'supportMetrics')[1]));
  report.supportHeight=j(0,'supportMetrics')[0]-j(0,'contactMetrics')[0];
  report.initialBarBelowKnee=j(0,'lowerleg01.L')[1]-j(0,'barPosition')[1];
  assert.ok(Math.abs(j(0,'supportMetrics')[1])<1e-6&&report.supportGapRange[0]>-1e-6&&report.supportGapRange[1]>3);
  assert.ok(report.supportHeight>1&&report.initialBarBelowKnee>.5);
  if(id==='block-pull'){
   assert.ok(poses.every(p=>Math.abs(p.joints.barPosition[2]-j(0,'barPosition')[2])<2.9),'Plates stay above block footprint');
  }else{
   assert.ok(poses.every(p=>p.joints.barPosition[2]>-3&&p.joints.barPosition[2]<5),'Shaft remains between rack posts');
  }
 }
 return report;
}
if(process.argv[2]){
 const id=process.argv[2],base='tools/media/imports/supported-deadlift-three-20261021/native/'+id;
 const result=checkPoses(id,JSON.parse(readFileSync(base+'/poses.json')));
 writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(id,result);
}
