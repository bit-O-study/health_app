const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = 'tools/media/imports/tempo-20261115';
const old = 'tools/media/imports/hundred-20261111';
const id = 'tempo-push-up';
assert.ok(!fs.existsSync(base + '/batch.json'), 'Already prepared');
const read = p => fs.readFileSync(p, 'utf8');
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const section = '\n## 2026-11-15 추가 제작 — 템포 푸시업\n\n- [진행중] tempo-push-up 신규 제작·검수·로컬 등록. 기존 완료 100종은 유지한다.\n  - [완료] 운영 manifest 직접 확인: 밝은 테마 515종, 어두운 테마 501종. 검수 완료 501/1351.\n  - [진행중] 3초 하강·1초 하단 정지·1초 상승·3초 상단 정지 동작과 양테마/알파 영상 제작.\n  - [대기] 481자세·기하 표본·시각 검수·재생/탐색/반복·알파·앱 연결 검사.\n  - [대기] 운영 반영·Android 실기기 확인.\n';
for (const file of ['docs/DEVELOPMENT-ROADMAP.md', 'docs/EXERCISE-VIDEO-RESUME.md']) {
  const text = read(file), at = text.indexOf('\n');
  fs.writeFileSync(file, text.slice(0, at + 1) + section + text.slice(at + 1));
}
write(base + '/batch.json', { createdAt: new Date().toISOString(), entries: [{ id, status: 'awaiting-preview-review', recipe: { family: 'tempo-push-up', sourceUrls: ['https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/'], sourcesCheckedAt: '2026-11-15', criteria: 'Rigid torso and straight legs; fixed palms and toes. Demonstration timing chosen for this asset: 3 seconds down, 1 second bottom hold, 1 second up, 3 seconds top hold. Timing is not prescribed by ACE.' } }] });
let motion = read(old + '/wide-push-up-motion.mjs').replace("export const exercises=['decline-push-up','close-grip-push-up','wide-push-up'];", "export const exercises=['tempo-push-up'];").replace("wide=id==='wide-push-up',width=wide?3.4:decline?2.5:1.5", "wide=id==='tempo-push-up',width=2.5");
fs.writeFileSync(base + '/' + id + '-motion.mjs', motion.replace('const angle=rad(', 'const angle=rad(-.84+'));
let studio = read(old + '/wide-push-up-studio.mjs').replace('lift=t<.4375?smooth(t/.4375):t<.5625?1:1-smooth((t-.5625)/.4375)', 'lift=t<.375?smooth(t/.375):t<.5?1:t<.625?1-smooth((t-.5)/.125):0');
fs.writeFileSync(base + '/' + id + '-studio.mjs', studio);
for (const file of ['render.mjs', 'verify.mjs', 'finalize.mjs']) {
  let text = read(old + '/' + file).replaceAll(old, base);
  if (file === 'render.mjs') text = text.replace("writeFileSync(out+'/poses.json',JSON.stringify(poses));", "writeFileSync(out+'/poses.json',JSON.stringify(poses));\n const geometry=[];for(let frame=0;frame<=480;frame+=30)geometry.push({frame,...await page.evaluate(f=>window.inspectGeometry(f),frame)});writeFileSync(out+'/geometry.json',JSON.stringify(geometry,null,2));");
  fs.writeFileSync(base + '/' + file, text);
}
let check = read(old + '/check-pushups.cjs').replaceAll(old, base).replace("['decline-push-up','close-grip-push-up','wide-push-up']", "['tempo-push-up']");
// A 1-second ascent is sampled at 60 samples/sec. Validate its continuity independently of slower baseline clips.
check = check.replace('maxStep<.12', 'maxStep<.3');
check = check.replace("assert.equal(poses.length,481);", "assert.equal(poses.length,481);assert.deepEqual(poses[180].joints,poses[240].joints,'one-second bottom hold');assert.deepEqual(poses[300].joints,poses[479].joints,'three-second top hold');assert.ok(distance(poses[0].joints.root,poses[180].joints.root)>1,'non-static descent');");
fs.writeFileSync(base + '/check.cjs', check);
console.log('Prepared tempo-push-up');
