// 검토 통과했던 v3 운동 영상을 누끼(라이트/다크) 방식으로 순서대로 다시 렌더한다.
// 대상 목록은 첫 실행 때 motion-guides/_cutout-rebuild/targets.json 에 고정 — 재렌더로 manifest 가 줄어도 목록은 안 바뀐다.
// 이미 끝난 종목은 build() 캐시(renderVersion·해시)로 건너뛰므로 중단 후 다시 실행하면 이어서 한다.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { manageMotionGuides } from './manage-motion-guides.mjs';

const work = resolve('tools/media/motion-guides/_cutout-rebuild');
mkdirSync(work, { recursive: true });
const targetsPath = join(work, 'targets.json');
const logPath = join(work, 'progress.log');
if (!existsSync(targetsPath)) {
  const reviews = JSON.parse(readFileSync('tools/media/motion-guides/reviews.json', 'utf8'));
  writeFileSync(targetsPath, JSON.stringify([...new Set(reviews.filter(r => r.status === 'passed').map(r => r.id))].sort(), null, 2));
}
const targets = JSON.parse(readFileSync(targetsPath, 'utf8'));
const log = msg => { const line = `${new Date().toISOString()} ${msg}`; console.log(line); appendFileSync(logPath, line + '\n'); };

log(`start ${targets.length} targets`);
// 다른 세션이 빌드 중(BUSY)이거나 실패한 종목은 맨 뒤로 보내 한 번 더 시도한다
let queue = targets.map(id => ({ id, attempt: 1 }));
const failed = [];
for (let n = 0; n < queue.length; n++) {
  const { id, attempt } = queue[n];
  const t0 = Date.now();
  try {
    await manageMotionGuides('motion-build', id);
    log(`[${n + 1}/${queue.length}] ${id} ok ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (error) {
    const message = String(error?.message ?? error).split('\n')[0];
    if (attempt < 2) { queue.push({ id, attempt: attempt + 1 }); log(`[${n + 1}/${queue.length}] ${id} RETRY-LATER ${message}`); }
    else { failed.push(id); log(`[${n + 1}/${queue.length}] ${id} FAILED ${message}`); }
  }
}
log(`done; failed ${failed.length}: ${failed.join(', ')}`);
