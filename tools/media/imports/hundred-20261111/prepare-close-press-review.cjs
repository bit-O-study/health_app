const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const content={},notes={};
const movements={'squeeze-press':'손바닥이 서로 마주 보게 잡고 덤벨을 모은 채 가슴 위로 밀어 올렸다가 내린다.','tate-press':'팔꿈치를 옆으로 벌리며 덤벨을 가슴 쪽으로 접어 내린 뒤 팔꿈치를 펴서 들어 올린다.'};
for(const [id,movement] of Object.entries(movements)){
 const x={equipment:'dumbbell',setup:'평벤치에 등과 머리를 받치고 양발을 바닥에 둔 채 덤벨을 잡는다.',movement,tip:'덤벨을 얼굴 쪽으로 내리지 않는다. 가벼운 무게로 반동 없이 움직인다.'};content[id]=x;
 notes[id]={checks:{exercise:'Distinct '+id+' path inspected in full and side preview sheets',equipment:'Two dumbbells and flat bench with head support',setup:x.setup,hands:id==='squeeze-press'?'Neutral close grip with constant dumbbell spacing':'Outward elbows and inward folding forearms; dumbbells separated after correction',feet:'Both feet, head and trunk fixed',movement},limitations:['Slow procedural demonstration; not captured human movement or full collision certification.','Small elbow bend retained at top; the bottom deliberately stops above the chest.','Squeeze dumbbells maintain a small geometric gap rather than simulating compression force. Sampled plate/body/pad and inter-dumbbell clearances are recorded.']};
}
fs.writeFileSync(base+'/close-presses-notes.json',JSON.stringify(notes,null,2)+'\n');fs.writeFileSync(base+'/close-presses-content.json',JSON.stringify(content,null,2)+'\n');
const mp='src/features/routine/exercise-methods.ts',gp='src/features/workout-timer/exercise-guides.ts';let m=fs.readFileSync(mp,'utf8'),g=fs.readFileSync(gp,'utf8');for(const id of Object.keys(content))assert.ok(!m.includes(JSON.stringify(id)+':'));
const methods=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({equipment:x.equipment,steps:[x.setup,x.movement,x.tip]},null,2)).join(',\n');
const guides=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({setup:x.setup,targets:[{name:id==='tate-press'?'삼두':'가슴·삼두',feel:'상체를 고정하고 팔을 천천히 펴는 느낌'}],cues:[x.movement,x.tip],beginnerTips:['가벼운 덤벨을 사용한다']},null,2)).join(',\n');
fs.writeFileSync(mp,m.replace('steps: string[] }> = {','steps: string[] }> = {\n'+methods+','));fs.writeFileSync(gp,g.replace('const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {\n'+guides+','));
