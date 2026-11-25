const fs=require('node:fs'),assert=require('node:assert/strict');
for(const id of ['wide-cable-face-pull']){
 const setup='???? ?? ??? ??? ??? ? ?? ??? ???. ??? ????? ??? ??? ???.';
 const cue='몸통을 고정하고 팔꿈치를 벌리며 로프를 얼굴 양옆으로 당긴 뒤 천천히 팔을 뻗는다.';
 for(const [file,anchor,method]of [['src/features/routine/exercise-methods.ts','const REVIEWED_RESISTANCE_METHODS: Record<string, { equipment: EquipmentId; steps: string[] }> = {',true],['src/features/workout-timer/exercise-guides.ts','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {',false]]){
  let text=fs.readFileSync(file,'utf8');assert.ok(text.includes(anchor)&&!text.includes('"'+id+'": {'));
  const value=method?{equipment:'cable',steps:[setup,cue,'허리를 젖히거나 어깨를 으쓱하지 않고 손목을 편안하게 유지한다.']}:{setup,targets:[{name:'어깨 뒤쪽·등 위쪽',feel:'팔꿈치를 벌려 당길 때 어깨 뒤와 등 위쪽에 힘이 모이는 느낌'}],cues:[cue,'손이 귀 옆으로 오도록 로프 끝을 벌린다'],beginnerTips:['몸통이 뒤로 넘어가지 않는 가벼운 무게로 시작한다','반동 없이 돌아가며 중량판을 내려놓는다']};
  text=text.replace(anchor,anchor+'\n  '+JSON.stringify(id)+': '+JSON.stringify(value,null,2).replaceAll('\n','\n  ')+',');fs.writeFileSync(file,text);
 }
}
