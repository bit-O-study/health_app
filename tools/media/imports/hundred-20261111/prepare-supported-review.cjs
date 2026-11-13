const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const content={},notes={};
const movements={'incline-rear-delt-raise':'팔꿈치를 살짝 굽힌 채 양팔을 옆으로 벌려 어깨 높이까지 올렸다가 천천히 내린다.','incline-bench-dumbbell-row':'팔꿈치를 뒤로 당겨 덤벨을 몸 옆으로 끌어올렸다가 천천히 팔을 편다.','prone-y-raise':'양팔을 머리 앞 대각선으로 올려 Y자를 만든 뒤 천천히 내린다.'};
for(const [id,movement] of Object.entries(movements)){
 const x={equipment:'dumbbell',setup:'45도 벤치에 가슴을 대고 양발을 바닥에 고정한 채 덤벨을 잡는다.',movement,tip:'가슴을 벤치에서 떼거나 허리를 젖히지 않는다. 가벼운 무게로 반동 없이 움직인다.'};content[id]=x;
 notes[id]={checks:{exercise:'Distinct '+id+' path inspected in full and side preview sheets',equipment:'Two dumbbells and inclined chest support',setup:x.setup,hands:'Closed grips with wrists aligned to forearms',feet:'Both planted feet and trunk stationary',movement},limitations:['Slow procedural demonstration, not motion capture or clinical certification.','Simplified narrow chest bench; virtual floor at -7.9, soles have 0.0071 model-unit clearance.','Seventeen geometry samples cover chest contact and dumbbell plate clearance against central body and pad; not full mesh collision certification.']};
}
fs.writeFileSync(base+'/supported-pulls-notes.json',JSON.stringify(notes,null,2)+'\n');fs.writeFileSync(base+'/supported-pulls-content.json',JSON.stringify(content,null,2)+'\n');
const mp='src/features/routine/exercise-methods.ts',gp='src/features/workout-timer/exercise-guides.ts';let m=fs.readFileSync(mp,'utf8'),g=fs.readFileSync(gp,'utf8');for(const id of Object.keys(content))assert.ok(!m.includes(JSON.stringify(id)+':'));
const methods=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({equipment:x.equipment,steps:[x.setup,x.movement,x.tip]},null,2)).join(',\n');
const guides=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({setup:x.setup,targets:[{name:'등·어깨',feel:'상체를 고정하고 팔을 천천히 움직이는 느낌'}],cues:[x.movement,x.tip],beginnerTips:['가벼운 덤벨을 사용한다']},null,2)).join(',\n');
fs.writeFileSync(mp,m.replace('steps: string[] }> = {','steps: string[] }> = {\n'+methods+','));fs.writeFileSync(gp,g.replace('const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {\n'+guides+','));
