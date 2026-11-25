const fs=require('node:fs'),assert=require('node:assert/strict');
for(const id of ["chest-supported-rear-delt-raise"]){
 const setup='벤치를 약 30~45도로 세우고 가슴을 패드에 댄다. 양발을 바닥에 두고 가벼운 덤벨을 잡아 팔을 아래로 늘어뜨린다.';
 const cue=id==='incline-dumbbell-y-raise'?'팔을 길게 유지하며 대각선 위로 들어 Y 모양을 만든 뒤 천천히 내린다.':'팔꿈치를 살짝 굽힌 각도를 유지하며 팔을 옆으로 벌린다. 어깨 높이에서 멈췄다가 천천히 내린다.';
 for(const [file,anchor,method]of [['src/features/routine/exercise-methods.ts','const REVIEWED_RESISTANCE_METHODS: Record<string, { equipment: EquipmentId; steps: string[] }> = {',true],['src/features/workout-timer/exercise-guides.ts','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {',false]]){
  let text=fs.readFileSync(file,'utf8');assert.ok(text.includes(anchor)&&!text.includes('"'+id+'": {'));
  const value=method?{equipment:'dumbbell',steps:[setup,cue,'가슴을 패드에서 떼거나 허리를 젖히지 않고 어깨를 편안하게 유지한다.']}:{setup,targets:[{name:'등 위쪽·어깨 뒤쪽',feel:'몸통이 고정된 상태에서 팔을 들 때 어깨 뒤와 어깨뼈 주변에 힘이 모이는 느낌'}],cues:[cue,'목을 길게 유지하고 어깨를 으쓱하지 않는다'],beginnerTips:['아주 가벼운 덤벨로 시작한다','반동 대신 팔이 그리는 방향과 천천히 내리는 동작에 집중한다']};
  text=text.replace(anchor,anchor+'\n  '+JSON.stringify(id)+': '+JSON.stringify(value,null,2).replaceAll('\n','\n  ')+',');fs.writeFileSync(file,text);
 }
}
