import assert from 'node:assert/strict';
export function checkPoses(id, poses) {
  assert.equal(poses.length,481);
  assert.deepEqual(poses[0].joints,poses.at(-1).joints);
  const first=poses[0].joints,dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
  const report={samples:481,loopError:0,footDrift:0,floorGap:Infinity,bodyShaftClearance:Infinity,gripAlignment:0,gripWidth:[Infinity,0],startKneeDegrees:first.calibration[0],shaftRadius:first.calibration[1],initialBackAngleDrift:0};
  const angle=j=>2*Math.asin(j.rootRotation[0])*180/Math.PI;
  for(const {frame,joints:j} of poses){
    assert.ok(Object.values(j).flat().every(Number.isFinite));
    for(const side of ['L','R'])report.footDrift=Math.max(report.footDrift,dist(j['foot.'+side],first['foot.'+side]));
    report.floorGap=Math.min(report.floorGap,j.contactMetrics[1]-j.contactMetrics[0]);
    report.bodyShaftClearance=Math.min(report.bodyShaftClearance,j.contactMetrics[2]);
    const a=j['grip.0'],b=j['grip.1'],width=dist(a,b);
    report.gripWidth[0]=Math.min(report.gripWidth[0],width);report.gripWidth[1]=Math.max(report.gripWidth[1],width);
    for(const grip of [a,b])report.gripAlignment=Math.max(report.gripAlignment,Math.hypot(grip[1]-j.barPosition[1],grip[2]-j.barPosition[2]));
    if(frame<=192&&j.barPosition[1]<j['lowerleg01.L'][1])report.initialBackAngleDrift=Math.max(report.initialBackAngleDrift,Math.abs(angle(j)-angle(first)));
  }
  assert.ok(report.footDrift<1e-6);
  assert.ok(Math.abs(report.floorGap)<1e-6,'Floor start without penetration');
  assert.ok(report.bodyShaftClearance>.02,'Sampled bar/body separation');
  assert.ok(report.gripAlignment<1e-6,'Hands aligned with shaft');
  assert.ok(report.gripWidth[1]<12,'Hands inside collars');
  for(let i=1;i<=192;i++)assert.ok(poses[i].joints.barPosition[1]>=poses[i-1].joints.barPosition[1]-1e-6,'Monotonic ascent');
  for(let i=241;i<=432;i++)assert.ok(poses[i].joints.barPosition[1]<=poses[i-1].joints.barPosition[1]+1e-6,'Monotonic descent');
  if(id==='snatch-grip-deadlift')assert.ok(report.gripWidth[0]>2*first.shoulderWidth[0],'Wide snatch grip');
  else assert.ok(report.gripWidth[0]>first.shoulderWidth[0]&&report.gripWidth[1]<1.4*first.shoulderWidth[0]);
  if(id==='axle-bar-deadlift')assert.equal(report.shaftRadius,.21);
  else {assert.equal(report.shaftRadius,.12);assert.ok(report.initialBackAngleDrift<8,'Approximately fixed back angle through initial pull');}
  return report;
}
