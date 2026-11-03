import assert from 'node:assert/strict';
export function checkPoses(id,poses){
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 const first=poses[0].joints,dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 const report={samples:481,footDrift:0,floorGap:Infinity,bodyClearance:Infinity,gripAlignment:0,gripWidth:[Infinity,0]};
 for(const {joints:j} of poses){
  assert.ok(Object.values(j).flat().every(Number.isFinite));
  for(const side of ['L','R']){
   const [a,b,c]=['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side]);
   const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);
   const elbow=Math.acos(u.reduce((sum,x,i)=>sum+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))*180/Math.PI;
   assert.ok(elbow>160&&elbow<180.01,'Long arms');
  }
  for(const s of ['L','R'])report.footDrift=Math.max(report.footDrift,dist(j['foot.'+s],first['foot.'+s]));
  report.floorGap=Math.min(report.floorGap,j.contactMetrics[1]-j.contactMetrics[0]);
  report.bodyClearance=Math.min(report.bodyClearance,j.contactMetrics[2]);
  const a=j['grip.0'],b=j['grip.1'],w=dist(a,b);
  report.gripWidth[0]=Math.min(report.gripWidth[0],w);report.gripWidth[1]=Math.max(report.gripWidth[1],w);
  report.gripAlignment=Math.max(report.gripAlignment,Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]));
 }
 assert.ok(report.footDrift<1e-6,'Fixed feet');assert.ok(Math.abs(report.floorGap)<1e-6,'Floor contact');
 assert.ok(report.bodyClearance>.02,'Equipment body clearance');assert.ok(report.gripAlignment<1e-6,'Level hands');
 if(id==='trap-bar-deadlift')assert.ok(Math.abs(report.gripWidth[0]-6)<1e-6&&Math.abs(report.gripWidth[1]-6)<1e-6,'Trap handle width');
 if(id==='kettlebell-sumo-deadlift'){assert.ok(Math.abs(report.gripWidth[0]-1.3)<1e-6&&Math.abs(report.gripWidth[1]-1.3)<1e-6,'Single bell grip');assert.ok(Math.abs(first['foot.L'][0]-first['foot.R'][0])>5,'Wide stance');}
 for(let i=1;i<=192;i++)assert.ok(poses[i].joints.barPosition[1]>=poses[i-1].joints.barPosition[1]-1e-6,'Ascent');
 for(let i=241;i<=432;i++)assert.ok(poses[i].joints.barPosition[1]<=poses[i-1].joints.barPosition[1]+1e-6,'Descent');
 return report;
}
