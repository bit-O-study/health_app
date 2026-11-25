const fs=require('node:fs'),assert=require('node:assert/strict');
const base='tools/media/imports/all-remaining-20261116',file=base+'/batch.json';
assert.ok(!fs.existsSync(file),'Already initialized');
const audit=JSON.parse(fs.readFileSync('tools/media/motion-refresh/all-exercises-progress.json','utf8'));
const entries=audit.entries.filter(e=>e.status!=='reviewed-both-themes').map(e=>({id:e.id,name:e.name,equipment:e.equipment,baselineStatus:e.status,status:'awaiting-motion-implementation'}));
assert.equal(entries.length,847);
fs.writeFileSync(file,JSON.stringify({createdAt:new Date().toISOString(),scope:'All remaining exercises; user requests continuous work until every exercise is connected.',totalExercises:audit.total,baselineReviewed:504,targetReviewed:1351,requestedExercises:847,expectedFiles:2541,status:'in-progress',completed:0,entries},null,2)+'\n');
const section='\n## 2026-11-16 전체 운동 영상 연결 — 0/847\n\n- [진행중] 사용자 지시: 100종 단위 종료를 취소하고, 모든 운동이 연결될 때까지 남은 전체 제작·보정·검수·로컬 앱 연결을 계속한다. 기준 504/1351, 남은 847종.\n  - [완료] 기존 검수 완료 504종과 미완료 847종을 분리해 `tools/media/imports/all-remaining-20261116/batch.json`에 고정.\n  - [진행중] 운동별 장비·동작 자료 확인, 재사용 가능한 리그 선별 및 신규 동작/장비 구현.\n  - [대기] 각 운동 밝은·어두운 MP4/투명 WebM, 자세·접촉·시각·전체decode·재생·탐색·반복 검수.\n  - [대기] 영상·설명·장비 매핑 연결, 회귀 검사 및 전체 타임라인 사양 동기화.\n  - [대기] 운영 반영·Android 실기기 검증. 로컬 연결과 운영 연결을 별도 보고한다.\n- 완료 처리 조건: 검수와 로컬 매핑 확인을 통과한 운동만 completed에 포함한다. 일괄 초안 생성만으로 완료 처리하지 않는다. 기존 템포 푸시업·포즈 힙 쓰러스트·템포 로우 로컬 완료는 기준 504종에 이미 포함.\n';
for(const p of ['docs/DEVELOPMENT-ROADMAP.md','docs/EXERCISE-VIDEO-RESUME.md']){const s=fs.readFileSync(p,'utf8'),at=s.indexOf('\n');fs.writeFileSync(p,s.slice(0,at+1)+section+s.slice(at+1));}
console.log({remaining:entries.length});
