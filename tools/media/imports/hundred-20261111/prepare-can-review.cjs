const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const content={},notes={};
for(const id of ['full-can-raise','empty-can-raise']){
 const up=id==='full-can-raise';const x={equipment:'dumbbell',setup:'양발을 고정하고 덤벨을 든 채 팔을 몸 옆보다 약간 앞쪽에 둔다.',movement:`엄지가 ${up?'위':'아래'}를 향하도록 잡고 팔을 앞쪽 대각선으로 어깨 높이 아래까지 올렸다가 내린다.`,tip:'가벼운 무게로 반동 없이 움직인다. 어깨에 통증이 생기면 중단한다.'};content[id]=x;
 notes[id]={checks:{exercise:'Distinct '+id+' scaption motion inspected in front and side sheets',equipment:'Two dumbbells with closed grips',setup:x.setup,hands:'Thumb-side grip axis points '+(up?'up':'down')+' at raised position; wrists aligned with forearms',feet:'Both feet and trunk remain fixed',movement:x.movement},limitations:['Procedural shoulder/forearm rotations; no physiological muscle simulation or full mesh collision certification.','Arm elevation limited below shoulder height; small fixed elbow bend.','Virtual floor at -7.9; no floor visible. Source study is a motion reference, not clinical suitability certification.']};
}
fs.writeFileSync(base+'/can-raises-notes.json',JSON.stringify(notes,null,2)+'\n');fs.writeFileSync(base+'/can-raises-content.json',JSON.stringify(content,null,2)+'\n');
const mp='src/features/routine/exercise-methods.ts',gp='src/features/workout-timer/exercise-guides.ts';let m=fs.readFileSync(mp,'utf8'),g=fs.readFileSync(gp,'utf8');for(const id of Object.keys(content))assert.ok(!m.includes(JSON.stringify(id)+':'));
const methods=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({equipment:x.equipment,steps:[x.setup,x.movement,x.tip]},null,2)).join(',\n');
const guides=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({setup:x.setup,targets:[{name:'어깨',feel:'반동 없이 천천히 들어 올리는 느낌'}],cues:[x.movement,x.tip],beginnerTips:['가벼운 덤벨을 사용하고 어깨를 으쓱하지 않는다']},null,2)).join(',\n');
fs.writeFileSync(mp,m.replace('steps: string[] }> = {','steps: string[] }> = {\n'+methods+','));fs.writeFileSync(gp,g.replace('const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {\n'+guides+','));
