import assert from 'node:assert/strict';
import {checkPoses as checkDeadlift} from './check-deadlift.mjs';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 if(id==='deadlift')return {...checkDeadlift(id,poses),loopError:0};
 const first=poses[0].joints,report={samples:481,loopError:0,footDrift:Math.max(...poses.flatMap(p=>['L','R'].map(s=>distance(p.joints['foot.'+s],first['foot.'+s]))))};
 assert.ok(report.footDrift<1e-6);
 if(id==='bench-press'){
  report.minimumChestGap=Math.min(...poses.map(p=>p.joints.chestClearance));
  report.nonChestGap=Math.min(...poses.map(p=>p.joints.equipmentNonChestClearance));
  report.headGap=Math.min(...poses.map(p=>p.joints.headClearance));
  report.backContactError=Math.max(...poses.map(p=>p.joints.backContactError));
  report.maximumWristDeviation=Math.max(...poses.flatMap(p=>p.joints.wristDeviation));
  assert.ok(Math.abs(report.minimumChestGap)<.01&&report.nonChestGap>.02&&report.headGap>.1);
  assert.ok(report.backContactError<.05&&report.maximumWristDeviation<35);
  for(const {joints:j}of poses){assert.ok(j.barGripPlaneError<1e-6&&Math.abs(j.gripSpan-6.2)<1e-6);assert.ok(j.headSupportError<1e-6);assert.ok(j.equipmentBenchClearance>0&&j.equipmentBackPadClearance>0);}
  for(let i=25;i<=240;i++)assert.ok(poses[i].joints.barCenter[1]<=poses[i-1].joints.barCenter[1]+1e-6);
  for(let i=265;i<=456;i++)assert.ok(poses[i].joints.barCenter[1]>=poses[i-1].joints.barCenter[1]-1e-6);
 }else{
  assert.equal(id,'plank');report.support=first.support;
  for(const {joints:j}of poses){
   assert.deepEqual(j,first,'Plank holds a fixed pose');assert.ok(j.support.every(x=>x>-.001),'No skin/cloth below ground');
   assert.ok(j.support.slice(0,4).every(x=>x<.04),'Forearms and toes contact ground');
   for(const s of ['L','R']){
    const shoulder=j['upperarm01.'+s],elbow=j['lowerarm01.'+s],wrist=j['wrist.'+s],hip=j['upperleg01.'+s],knee=j['lowerleg01.'+s],foot=j['foot.'+s];
    assert.ok(Math.abs(shoulder[2]-elbow[2])<1e-6&&Math.abs(shoulder[0]-elbow[0])<1e-6,'Elbows below shoulders');
    assert.ok(Math.abs(angle(shoulder,elbow,wrist)-90)<1e-6);
    assert.ok(angle(hip,knee,foot)>179,'Straight knees');
    // Shoulder width differs from hip width; assess sag in the sagittal plane.
    assert.ok(angle([0,shoulder[1],shoulder[2]],[0,hip[1],hip[2]],[0,foot[1],foot[2]])>173,'No hip sag or pike');
   }
  }
 }
 return report;
}
