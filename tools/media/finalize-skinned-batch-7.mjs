import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='tools/media/motion-refresh/skinned-3d/';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const verification=read(dir+'batch-7-verification.json');
if(verification.results.length!==3)throw Error('Expected three verified exercises');
for(const r of verification.results){
 for(const input of r.inputs)if(hash(dir+input.file)!==input.sha256)throw Error('Changed input');
 for(const t of r.themes)if(hash(t.file)!==t.sha256||t.decodedFrames!==480||!t.playback.looped||t.playback.error)throw Error('Unverified video');
}
const reviews=verification.results.map(r=>({...r,reviewedAt:new Date().toISOString(),status:'reviewed-preview',equipment:r.id==='close-grip-upright-row'?'barbell':'dumbbell',visualReview:'Full/hand/side key poses and both encoded contact sheets inspected. Arnold overhead framing corrected; atan2 winding discontinuity corrected; narrow-grip start height corrected before final render.',limits:'Preview only. No full-body collision proof, clinical validation, app integration or Android device review. upright-row is the dumbbell variant only.'}));
write(dir+'batch-7-reviews.json',reviews);
const queuePath='tools/media/motion-refresh/queue.json',q=read(queuePath);
for(const review of reviews){
 const row=q.exercises.find(e=>e.id===review.id);if(!row)throw Error('Missing catalog id');
 row.skinnedPreview={status:'reviewed-preview',equipment:review.equipment,themes:review.themes.map(({file,sha256})=>({file,sha256})),evidence:dir+'batch-7-reviews.json'};
 row.nextStep='3D preview complete; app integration and physical device review pending';
}
// 27 queue rows plus the separate lateral-raise pilot = 28 previews.
q.summary.skinnedPreviews=q.exercises.filter(e=>e.skinnedPreview).length+1;
write(queuePath,q);
const resume='docs/EXERCISE-VIDEO-RESUME.md',heading='## 2026-11-01 3D 7차 3종 제작·검증';
let doc=readFileSync(resume,'utf8');
const note=`${heading}
- 아놀드 프레스(arnold-press), 덤벨 업라이트 로우(upright-row, 덤벨 변형만), 클로즈 그립 업라이트 로우(close-grip-upright-row). 새 3종/양 테마 6파일, 누적 미리보기28종/56파일. 정식 앱·운영 배포 없음.
- 1080×1080 / 60fps / 8초 / 각480프레임. 3개 프로세스 동시 렌더. 10월31일 시작 후 도구 세션 단절, 11월1일 파일·입력 SHA 및 전체 decode를 새로 검증. 정확한 소요시간/전체 배치 실행 영수증은 복구되지 않아 속도 개선 수치 주장 없음.
- 아놀드 회전 분기 끊김·머리 위 덤벨 잘림·좁은 바벨 시작점 도달 범위 수정 후 최종 렌더. 정면/손/측면 및 양 테마 압축 MP4 접촉 시트 검수. 전체 신체 충돌/의학적 적합성 검증은 아님.
- skinned-batch*.test.mjs 63개 통과(신규7개), 새 소스8파일 ESLint 통과. 새 MP4 6개 전체 decode·입력 SHA·390px Chromium 중간 탐색/반복/가로넘침 검증 통과. 앱 전체 빌드·E2E·Android는 이번 범위에서 미실행.
- 증거: tools/media/motion-refresh/skinned-3d/batch-7-sources.json, batch-7-verification.json, batch-7-reviews.json. queue 정식 영상 상태는 보존, skinnedPreviews:28. queue에는 기존 lateral pilot이 별도라 preview행27개.
- 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html?exercise=arnold-press . 재실행: node tools/media/serve-skinned-gallery.mjs . 서버는 로컬 미리보기용, 상주 자동 생성 작업 없음.
- 다음: 미제작 운동을 3개씩, 출처/장비/자세별 검수 유지. 앱 경로·자막·캐시 통합 및 Android 검증은 별도 미완료.

`;
if(!doc.includes(heading)){const at=doc.indexOf('\n')+1;doc=doc.slice(0,at)+'\n'+note+doc.slice(at);writeFileSync(resume,doc);}
const roadmap='docs/DEVELOPMENT-ROADMAP.md';doc=readFileSync(roadmap,'utf8');
doc=doc.replace('- [진행중] 2026-10-31 3D 운동 영상 7차 3종:', '- [진행중] 2026-11-01 3D 운동 영상 7차 3종 (미리보기 제작 완료, 앱 통합 대기):')
 .replace('  - [진행중] 운동별 동작 구현, 3개 동시 렌더, 양 테마·중간 자세·그립·회전 검수.','  - [완료] 운동별 동작 구현, 3개 동시 렌더, 양 테마·중간 자세·그립·회전 검수. 새3종/6파일, 누적28종/56파일.')
 .replace('  - [대기] 481자세 회귀 검사, 전체 decode, 브라우저 탐색·반복 검증 및 갤러리 연결.','  - [완료] 각481자세 포함 검사63개·대상 ESLint 통과. 새6영상 전체480프레임 decode/SHA 및 390px 탐색·반복 검증. 증거 batch-7-verification.json / batch-7-reviews.json. 세션 단절로 렌더 소요시간은 주장하지 않음.');
writeFileSync(roadmap,doc);
console.log(JSON.stringify({reviewed:reviews.length,skinnedPreviews:q.summary.skinnedPreviews,productionPublished:false}));
