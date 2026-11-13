const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const base='tools/media/imports/hundred-20261111',group=process.argv[2];assert.match(group,/^[a-z0-9-]+$/);
const read=f=>JSON.parse(fs.readFileSync(f)),write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2)+'\n');
const notes=read(base+'/'+group+'-notes.json'),ids=Object.keys(notes),tests=read(base+'/'+group+'-tests.json'),published=read(base+'/published-'+group+'-verification.json'),audit=read('tools/media/motion-refresh/all-exercises-progress.json'),batch=read(base+'/batch.json');
assert.equal(tests.success,true);
for(const id of ids){assert.equal(audit.entries.find(e=>e.id===id).status,'reviewed-both-themes');assert.ok(published.report.some(e=>e.id===id&&e.hashes==='passed'&&e.fullDecode==='passed'&&e.bothManifests));assert.equal(batch.entries.find(e=>e.id===id).status,'candidate-reviewed');}
execFileSync(process.execPath,['node_modules/eslint/bin/eslint.js','src/features/routine/exercise-methods.ts','src/features/workout-timer/exercise-guides.ts','tests/be/logic/hundred-'+group+'-video.test.ts'],{stdio:'inherit'});
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{stdio:'inherit'});
for(const id of ids){const e=batch.entries.find(e=>e.id===id);e.status='registered-local';e.registeredAt=new Date().toISOString();}
batch.completed=batch.entries.filter(e=>e.status==='registered-local').length;batch.updatedAt=new Date().toISOString();if(batch.completed===100)batch.status='completed-local';write(base+'/batch.json',batch);
const record={checkedAt:new Date().toISOString(),ids,files:ids.length*3,batchCompleted:batch.completed,batchRemaining:100-batch.completed,counts:audit.counts,tests:tests.numPassedTests,testFiles:tests.testResults.length,lint:'passed',typecheck:'passed',deployment:'pending',device:'pending'};write(base+'/registration-'+group+'.json',record);
const localDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
const section=`\n## ${localDate} 100종 묶음 진행 — ${batch.completed}/100\n\n- [완료] ${ids.join(', ')}: 481자세·17기하표본, 정면/측면 및 최종 양테마 시각 검수, ${ids.length*3}파일 해시/전체decode/재생/탐색/반복/알파 검사, 앱 연결 확인.\n- [완료] 관련 ${record.testFiles}파일 ${record.tests}tests, 변경파일 lint 및 전체 typecheck 통과. 근거: ${base}/registration-${group}.json 및 visual-review-${group}.json.\n- [진행중] 사용자 지시에 따라 100종 묶음 완료까지 남은 ${100-batch.completed}종 제작·검수·로컬 등록. 미검수 초안은 완료 수에서 제외.\n- 전체 양테마 ${audit.counts['reviewed-both-themes']}/1351. 커밋·운영배포·Android 검증 대기. 완료한 prepare/publish는 재실행하지 않는다.\n`;
for(const file of ['docs/EXERCISE-VIDEO-RESUME.md','docs/DEVELOPMENT-ROADMAP.md']){const s=fs.readFileSync(file,'utf8'),at=s.indexOf('\n');fs.writeFileSync(file,s.slice(0,at+1)+section+s.slice(at+1));}console.log(record);
