const fs=require('node:fs');
const setup='바로 누워 한쪽 다리를 편 채 바닥에 둡니다. 반대쪽 무릎을 굽혀 가슴 쪽으로 가져옵니다.';
const cue='같은 쪽 손으로 무릎 바깥을, 반대쪽 손으로 발목 바깥을 받칩니다. 무릎을 반대쪽 어깨 방향으로 부드럽게 당겨 유지합니다.';
const tip='머리와 등을 지지하고 골반을 크게 비틀지 않습니다. 무릎에 불편함이 생기도록 당기지 말고 반대쪽도 반복합니다.';
for(const [path,anchor,guide]of [
 ['src/features/routine/exercise-methods.ts','const REVIEWED_RESISTANCE_METHODS: Record<string, { equipment: EquipmentId; steps: string[] }> = {',false],
 ['src/features/workout-timer/exercise-guides.ts','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {',true],
]){
 let text=fs.readFileSync(path,'utf8');
 for(const id of ['piriformis-stretch','lying-glute-stretch']){
  const value=guide?{setup,targets:[{name:id==='piriformis-stretch'?'이상근과 엉덩이':'엉덩이 뒤쪽',feel:'굽힌 다리의 엉덩이가 부드럽게 늘어나는 느낌'}],cues:[cue],beginnerTips:[tip]}:{equipment:'bodyweight',steps:[setup,cue,tip]};
  if(text.includes('  "'+id+'": {'))throw Error('Already added '+id);
  const block='  '+JSON.stringify(id)+': '+JSON.stringify(value,null,2).replace(/\n/g,'\n  ')+',\n';
  text=text.replace(anchor,anchor+'\n'+block);
 }
 fs.writeFileSync(path,text,'utf8');
}
