// 8패널 원본을 16패널로 교체 등록하고 렌더까지 돌린다.
// 사용법: node tools/media/repanel-16.mjs <생성된 PNG 디렉터리>
//   PNG 파일명은 <운동 ID>.png. 디렉터리는 반드시 ~/.codex/generated_images 아래여야 한다
//   (motion-register 가 그 경로만 받는다).
// 아직 PNG 가 없는 종목은 조용히 건너뛰므로, 이미지를 만드는 대로 여러 번 다시 실행하면 이어서 처리된다.
// 프롬프트·출처·기구는 motion-guides/_repanel-16/plan.json 에 있다.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { manageMotionGuides } from './manage-motion-guides.mjs';

const pngDir = process.argv[2];
if (!pngDir) { console.error('사용법: node tools/media/repanel-16.mjs <PNG 디렉터리>'); process.exit(1); }

const work = resolve('tools/media/motion-guides/_repanel-16');
mkdirSync(work, { recursive: true });
const plan = JSON.parse(readFileSync(join(work, 'plan.json'), 'utf8'));
const logPath = join(work, 'progress.log');
const log = msg => { const line = `${new Date().toISOString()} ${msg}`; console.log(line); appendFileSync(logPath, line + '\n'); };

log(`start; ${plan.groupA_convert.length} targets; png dir ${resolve(pngDir)}`);
const missing = [], failed = [];
for (const entry of plan.groupA_convert) {
  const png = resolve(pngDir, entry.id + '.png');
  if (!existsSync(png)) { missing.push(entry.id); continue; }
  const spec = {
    prompt: entry.prompt,
    equipment: entry.equipment,
    sources: entry.sources,
    panels: 16,
    cycle: entry.cycle ?? 'reverse',
    ...(entry.cutout === false ? { cutout: false } : {}),
  };
  const t0 = Date.now();
  try {
    // 등록은 기존 8패널 spec 과 원본 JPG 를 덮어쓴다 — 기존 리뷰는 해시 불일치로 자동 비공개된다.
    await manageMotionGuides('motion-register', entry.id, png, encodeURIComponent(JSON.stringify(spec)));
    await manageMotionGuides('motion-build', entry.id);
    log(`${entry.id} ok ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (error) {
    const message = String(error?.message ?? error).split('\n')[0];
    failed.push(entry.id);
    log(`${entry.id} FAILED ${message}`);
  }
}
log(`done; 처리 안 됨(PNG 없음) ${missing.length}: ${missing.join(', ')}`);
if (failed.length) log(`실패 ${failed.length}: ${failed.join(', ')}`);
log('렌더된 종목은 라이트/다크 접촉시트를 사람이 다시 보고 motion-review 로 기록해야 공개된다.');
