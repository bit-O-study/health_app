const fs=require('node:fs'),assert=require('node:assert/strict');
for(const id of ['prone-t-raise','prone-w-raise']){
 const setup='매트에 엎드려 목을 길게 유지하고 시선을 바닥으로 둔다. '+(id==='prone-t-raise'?'팔꿈치를 편 채 양팔을 옆으로 벌려 T 모양을 만든다.':'팔꿈치를 굽혀 양팔을 W 모양으로 벌린다.');
 const cue='배와 골반을 고정하고 어깨뼈를 모으며 양팔을 조금 들어 올린 뒤 천천히 내린다.';
 for(const [file,anchor,method]of [['src/features/routine/exercise-methods.ts','const REVIEWED_RESISTANCE_METHODS: Record<string, { equipment: EquipmentId; steps: string[] }> = {',true],['src/features/workout-timer/exercise-guides.ts','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {',false]]){
  let text=fs.readFileSync(file,'utf8');assert.ok(text.includes(anchor)&&!text.includes('"'+id+'": {'));
  const value=method?{equipment:'bodyweight',steps:[setup,cue,'허리를 젖히거나 턱을 들지 않고 팔 모양을 유지한다.']}:{setup,targets:[{name:'등 위쪽·어깨 뒤쪽',feel:'팔을 들 때 어깨뼈 사이와 어깨 뒤쪽에 힘이 모이는 느낌'}],cues:[cue,'어깨를 귀에서 멀리 두고 작게 움직인다'],beginnerTips:['손에 무게를 들지 않고 시작한다','팔을 높이 들기보다 몸통을 안정적으로 유지한다']};
  text=text.replace(anchor,anchor+'\n  '+JSON.stringify(id)+': '+JSON.stringify(value,null,2).replaceAll('\n','\n  ')+',');fs.writeFileSync(file,text);
 }
}
