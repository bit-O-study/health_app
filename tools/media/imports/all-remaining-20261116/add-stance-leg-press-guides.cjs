const fs=require('node:fs'),assert=require('node:assert/strict');
const definitions={
 'wide-stance-leg-press':{setup:'등과 골반을 지지하고 양발을 어깨너비보다 넓게 발판에 둔다. 발끝은 편안한 각도로 조금 바깥을 향한다.',cue:'무릎이 발끝 방향을 따라가도록 양발로 발판을 민다.'},
 'close-stance-leg-press':{setup:'등과 골반을 지지하고 양발을 어깨너비보다 좁게 발판에 둔다. 발바닥 전체를 붙인다.',cue:'좁은 발 간격을 유지하고 무릎이 안으로 모이지 않도록 발판을 민다.'},
 'full-rom-leg-press':{setup:'등과 골반을 지지하고 양발을 편안한 너비로 발판에 둔다. 손잡이를 잡는다.',cue:'골반이 뜨지 않는 범위까지 무릎을 굽혔다가 발판을 밀어 돌아온다.'},
};
for(const [file,anchor,method]of [['src/features/routine/exercise-methods.ts','const REVIEWED_RESISTANCE_METHODS: Record<string, { equipment: EquipmentId; steps: string[] }> = {',true],['src/features/workout-timer/exercise-guides.ts','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {',false]]){
 let text=fs.readFileSync(file,'utf8');assert.ok(text.includes(anchor));const blocks=[];
 for(const [id,d]of Object.entries(definitions)){assert.ok(!text.includes('"'+id+'": {'));const value=method?{equipment:'machine',steps:[d.setup,d.cue,'무릎을 완전히 잠그지 않고 천천히 돌아온다. 발바닥과 허리를 지지면에 유지한다. 영상의 범위와 속도는 예시다.']}:{setup:d.setup,targets:[{name:'대퇴사두·둔근',feel:'발판을 밀고 통제하며 돌아올 때 허벅지와 엉덩이에 힘이 드는 느낌'}],cues:[d.cue,'등과 골반을 지지면에 유지하고 무릎을 잠그지 않는다'],beginnerTips:['발 간격과 발끝 각도는 편안한 범위로 조절한다','영상의 무릎 각도는 예시다. 허리가 말리거나 골반이 뜨기 전에 멈춘다']};blocks.push('  '+JSON.stringify(id)+': '+JSON.stringify(value,null,2).replaceAll('\n','\n  ')+',');}
 text=text.replace(anchor,anchor+'\n'+blocks.join('\n'));fs.writeFileSync(file,text);
}
