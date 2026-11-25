const fs=require('node:fs'),assert=require('node:assert/strict');
const setup='한쪽 발을 발판에 두고 손잡이를 잡는다. 몸통을 앞으로 기울여 지지하고 운동할 다리의 허벅지 앞과 발목 위 뒤쪽을 패드에 맞춘다.',cue='허벅지와 골반을 고정한 채 한쪽 무릎을 굽혀 뒤꿈치를 엉덩이 쪽으로 당긴다.';
for(const [file,anchor,method]of [['src/features/routine/exercise-methods.ts','const REVIEWED_RESISTANCE_METHODS: Record<string, { equipment: EquipmentId; steps: string[] }> = {',true],['src/features/workout-timer/exercise-guides.ts','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {',false]]){
let text=fs.readFileSync(file,'utf8');assert.ok(text.includes(anchor));const blocks=[];
for(const id of ['standing-single-leg-curl','standing-leg-curl-machine']){assert.ok(!text.includes('"'+id+'": {'));const value=method?{equipment:'machine',steps:[setup,cue,'천천히 무릎을 펴며 돌아온다. 한쪽을 마친 뒤 반대쪽도 실시한다. 영상은 원판을 싣는 기구의 예시다.']}:{setup,targets:[{name:'햄스트링',feel:'무릎을 굽히고 천천히 펼 때 허벅지 뒤쪽에 힘이 드는 느낌'}],cues:[cue,'허리를 젖히거나 몸통을 흔들지 않고 천천히 돌아온다'],beginnerTips:['기구의 회전축을 무릎 옆에 맞추고 패드 위치를 조절한다','한쪽씩 실시한다. 영상의 속도와 가동 범위는 예시다']};blocks.push('  '+JSON.stringify(id)+': '+JSON.stringify(value,null,2).replaceAll('\n','\n  ')+',');}
text=text.replace(anchor,anchor+'\n'+blocks.join('\n'));fs.writeFileSync(file,text);
}
