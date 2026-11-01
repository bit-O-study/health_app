import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 const first=poses[0].joints,normal=id==='smith-machine-deadlift',stiff=id==='smith-machine-stiff-leg-deadlift';
 const report={samples:481,footDrift:0,floorGap:Infinity,bodyClearance:Infinity,railDrift:0,gripError:0,knees:[180,0],elbows:[180,0],barY:[Infinity,-Infinity]};
 for(const {joints:j} of poses){
  assert.ok(Object.values(j).flat().every(Number.isFinite));
  for(const side of ['L','R']){
   report.footDrift=Math.max(report.footDrift,dist(j['foot.'+side],first['foot.'+side]));
   const knee=angle(...['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side])),elbow=angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side]));
   report.knees=[Math.min(report.knees[0],knee),Math.max(report.knees[1],knee)];report.elbows=[Math.min(report.elbows[0],elbow),Math.max(report.elbows[1],elbow)];
  }
  report.floorGap=Math.min(report.floorGap,j.contactMetrics[1]-j.contactMetrics[0]);report.bodyClearance=Math.min(report.bodyClearance,j.contactMetrics[2]);
  report.railDrift=Math.max(report.railDrift,Math.abs(j.barPosition[0]),Math.abs(j.barPosition[2]-1.5));
  report.barY=[Math.min(report.barY[0],j.barPosition[1]),Math.max(report.barY[1],j.barPosition[1])];
  for(const [i,sign] of [[0,1],[1,-1]])report.gripError=Math.max(report.gripError,dist(j['grip.'+i],[sign*2.45,j.barPosition[1],1.5]));
 }
 assert.ok(report.footDrift<1e-6,'Fixed feet');assert.ok(report.floorGap>-1e-6,'No floor penetration');assert.ok(report.bodyClearance>.02,'Bar body clearance');
 assert.ok(report.railDrift<1e-6,'Fixed rail path');assert.ok(report.gripError<1e-6,'Hand contact');assert.ok(report.elbows[0]>160&&report.elbows[1]<180.01,'Long arms');
 if(normal){assert.ok(Math.abs(report.floorGap)<1e-6,'Floor start');assert.ok(report.knees[0]<120&&report.knees[1]>170,'Knee extension');assert.ok(first.barPosition[1]<poses[240].joints.barPosition[1]-3);}
 else{assert.ok(report.knees[1]-report.knees[0]<1e-6,'Fixed knee bend');assert.ok(Math.abs(report.knees[0]-(stiff?170:155))<1e-6,'Distinct hinge knee angle');assert.ok(first.barPosition[1]>poses[240].joints.barPosition[1]+2,'Standing start');assert.ok(report.floorGap>.1,'Hinge stays off floor');}
 return report;
}
