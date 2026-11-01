import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='tools/media/motion-refresh/skinned-3d/';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const verification=read(dir+'batch-8-verification.json');
if(verification.results.length!==3)throw Error('Expected three exercises');
for(const r of verification.results){
 for(const i of r.inputs)if(hash(dir+i.file)!==i.sha256)throw Error('Changed input');
 if(r.themes.length!==2)throw Error('Expected both themes');
 for(const t of r.themes)if(hash(t.file)!==t.sha256||t.decodedFrames!==480||!t.playback.looped||t.playback.error)throw Error('Unverified video');
}
write(dir+'batch-8-reviews.json',verification.results.map(r=>({...r,status:'reviewed-preview',reviewedAt:new Date().toISOString(),equipment:'barbell',visualReview:'Full, side and hand key poses plus both encoded MP4 contact sheets inspected. Press top extension and drag-curl proximity corrected before final render. Behind-back shrug uses rear three-quarter view.',limits:'Preview only; central-shaft clearance and sampled visual review are not a complete full-body collision or clinical validation. App integration and Android review remain pending.'})));
const q=read('tools/media/motion-refresh/queue.json');
for(const r of verification.results){
 const row=q.exercises.find(e=>e.id===r.id);if(!row)throw Error('Unknown catalog id');
 row.skinnedPreview={status:'reviewed-preview',equipment:'barbell',themes:r.themes.map(({file,sha256})=>({file,sha256})),evidence:dir+'batch-8-reviews.json'};
 row.nextStep='3D preview complete; app integration and physical device review pending';
}
q.summary.skinnedPreviews=q.exercises.filter(e=>e.skinnedPreview).length+1;
write('tools/media/motion-refresh/queue.json',q);
const receipt=read(dir+'batch-8.json');
if(receipt.results.some(r=>r.code!==0))throw Error('Incomplete render batch');
const minutes=(Math.max(...receipt.results.map(r=>r.elapsedMs))/60000).toFixed(1);
const heading='## 2026-11-01 3D 8차 3종 제작·검증';
const note=`${heading}
- 바벨 오버헤드 프레스(barbell-overhead-press), 드래그 컬(drag-curl), 비하인드 백 슈러그(behind-the-back-shrug). 새3종/6파일, 누적 미리보기31종/62파일. 정식 앱·운영 배포 없음.
- 양 테마1080×1080 / 60fps / 8초 / 480프레임. 3프로세스 동시 렌더 최대 ${minutes}분. 실행 기록 batch-8.json.
- 오버헤드 프레스 상단 팔 펴짐, 드래그 컬 몸 가까운 바벨 경로 보정 후 최종 렌더. 슈러그 후면 사선 카메라. 정면/측면/손 자세·양 테마 압축 프레임 시트 육안 확인.
- 신규9개 포함 skinned-batch 동작 검사72개 통과. 대상 ESLint 통과. 새6영상 전체 decode·입력/영상SHA·390px Chromium 탐색/반복/가로넘침 검사 통과. 중앙 봉 간격 검사는 전신 충돌이나 의학적 검증을 의미하지 않음.
- 증거: tools/media/motion-refresh/skinned-3d/batch-8-sources.json, batch-8-verification.json, batch-8-reviews.json. 기존 정식영상 queue 상태 보존. queue preview행30개+별도 lateral pilot1개.
- 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html?exercise=barbell-overhead-press . 재실행 node tools/media/serve-skinned-gallery.mjs . 자동 생성 상주 작업 없음.
- 다음: 운동별 품질 검수 유지하며 후속3종 제작. 앱 경로·자막·캐시 통합과 Android 검증은 별도 미완료. 이번 앱 전체 빌드·E2E 미실행.

`;
const resume='docs/EXERCISE-VIDEO-RESUME.md';let s=readFileSync(resume,'utf8');
if(!s.includes(heading)){const at=s.indexOf('\n')+1;writeFileSync(resume,s.slice(0,at)+'\n'+note+s.slice(at));}
const rd='docs/DEVELOPMENT-ROADMAP.md';s=readFileSync(rd,'utf8');
s=s.replace('2026-11-01 3D 8차 3종:', '2026-11-01 3D 8차 3종 (미리보기 완료, 앱 통합 대기):')
 .replace('[진행중] 운동별 동작·그립·바벨 경로 구현 및 양 테마 렌더.','[완료] 운동별 동작·그립·바벨 경로 구현 및 양 테마1080p/60fps 렌더. 새3종/6파일, 누적31종/62파일.')
 .replace('[대기] 자세·decode·재생·육안 검증, 큐와 미리보기 갱신.','[완료] 동작검사72개·대상 ESLint 통과. 새6개 전체decode/SHA·모바일 탐색/반복·양 테마 시트 검수. batch-8-verification.json / batch-8-reviews.json. 큐와 갤러리 갱신.');
writeFileSync(rd,s);
console.log({reviewed:3,previews:q.summary.skinnedPreviews,maxRenderMinutes:minutes});
