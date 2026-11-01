import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

export function checkPoses(id, poses) {
  assert.equal(id, 'deficit-deadlift');
  assert.equal(poses.length, 481);
  assert.deepEqual(poses[0].joints, poses.at(-1).joints);
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const first = poses[0].joints;
  const report = {
    samples: poses.length,
    loopError: 0,
    footDrift: Math.max(...poses.flatMap(p => ['L', 'R'].map(s => dist(p.joints['foot.' + s], first['foot.' + s])))),
    gripAlignment: Math.max(...poses.map(p => Math.hypot(p.joints['grip.0'][1] - p.joints['grip.1'][1], p.joints['grip.0'][2] - p.joints['grip.1'][2]))),
    bodyShaftClearance: Math.min(...poses.map(p => p.joints.contactMetrics[2])),
    solePlatformGap: Math.max(...poses.map(p => Math.abs(p.joints.supportMetrics[1]))),
    platformHeight: first.supportMetrics[0] - first.supportMetrics[2],
    plateFloorClearance: Math.min(...poses.map(p => p.joints.supportMetrics[3])),
    barTravel: poses[192].joints.barPosition[1] - first.barPosition[1],
  };
  assert.ok(report.footDrift < 1e-6);
  assert.ok(report.gripAlignment < 1e-6);
  assert.ok(report.bodyShaftClearance > .02);
  assert.ok(report.solePlatformGap < 1e-6);
  assert.ok(report.platformHeight > .2 && report.platformHeight < 1);
  assert.ok(report.plateFloorClearance > -1e-6);
  assert.ok(Math.abs(first.supportMetrics[3]) < 1e-6);
  assert.ok(report.barTravel > 5);
  for (const { joints } of poses) {
    assert.ok(Object.values(joints).flat().every(Number.isFinite));
    for (const side of ['L', 'R']) {
      const foot = joints['foot.' + side], toe = joints['toe2-1.' + side];
      for (const point of [foot, toe]) assert.ok(Math.abs(point[0]) < 2.9 && point[2] > -1.3 && point[2] < 3.3);
    }
    assert.ok([0, 1].every(i => Math.abs(joints['gripAxis.' + i][0]) > .999));
  }
  for (let n = 1; n <= 192; n++) assert.ok(poses[n].joints.barPosition[1] >= poses[n - 1].joints.barPosition[1] - 1e-6);
  for (let n = 241; n <= 432; n++) assert.ok(poses[n].joints.barPosition[1] <= poses[n - 1].joints.barPosition[1] + 1e-6);
  return report;
}

if (process.argv[1]?.endsWith('check-poses.mjs') && process.argv[2]) {
  const id = process.argv[2], base = 'tools/media/imports/deficit-deadlift-20261023/native/' + id;
  const report = checkPoses(id, JSON.parse(readFileSync(base + '/poses.json')));
  writeFileSync(base + '/kinematics.json', JSON.stringify(report, null, 2) + '\n');
  console.log(report);
}
