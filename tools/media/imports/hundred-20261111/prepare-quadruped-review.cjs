const fs=require('node:fs'),assert=require('node:assert/strict');
const base='tools/media/imports/hundred-20261111';
const content={
 'donkey-kick':{equipment:'bodyweight',target:'둔근',setup:'양손을 어깨 아래, 무릎을 골반 아래에 둔 네발 자세를 만든다.',movement:'오른쪽 무릎을 굽힌 채 허벅지를 뒤로 들어 올렸다가 천천히 내린다.',tip:'오른쪽 시범이다. 허리를 꺾거나 골반을 돌리지 않고 반대쪽도 수행한다.',url:'https://www.rehabhero.ca/exercise/donkey-kick'},
 'fire-hydrant':{equipment:'bodyweight',target:'엉덩이 옆쪽',setup:'양손을 어깨 아래에 놓고 무릎을 굽힌 네발 자세로 몸통을 고정한다.',movement:'오른쪽 무릎을 굽힌 채 옆으로 벌렸다가 골반 아래로 천천히 되돌린다.',tip:'오른쪽 시범이다. 골반과 허리가 따라 돌아가지 않는 범위에서 움직인다.',url:'https://www.rehabhero.ca/exercise/fire-hydrant'},
 'cat-cow':{equipment:'bodyweight',target:'등과 몸통',setup:'양손과 무릎으로 지지하고 손을 어깨 아래, 무릎을 골반 아래에 놓는다.',movement:'손과 무릎을 고정한 채 등을 천천히 둥글게 말고 다시 부드럽게 펴 준다.',tip:'작은 범위의 반복 시범이다. 목이나 허리를 끝까지 꺾지 않고 편안하게 호흡한다.',url:'https://www.acefitness.org/resources/everyone/exercise-library/15/cat-cow/'}
};
const batch=JSON.parse(fs.readFileSync(base+'/batch.json')),notes={};
for(const [id,x]of Object.entries(content)){
 const entry=batch.entries.find(e=>e.id===id);assert.equal(entry.status,'motion-preview');entry.recipe.sourceUrls=[x.url];entry.recipe.sourcesCheckedAt='2026-11-13';
 notes[id]={checks:{exercise:id+' front and side eight-frame sheets inspected',equipment:'Bodyweight; no external apparatus',setup:x.setup,hands:'Forward-facing open palms remain fixed during the cycle',feet:id==='cat-cow'?'Both knees fixed; lower legs remain still':'Left support knee and lower leg fixed; right bent leg moves',movement:x.movement},limitations:['Procedural animation with simplified skin and clothing; no full mesh collision certification.','No rendered floor; palm and support-knee skin heights agree within 0.004 model units.','Support knee flexion is approximately 76 degrees; toes are relaxed above the virtual floor.',id==='cat-cow'?'Small-range spinal flexion/extension; eight-second loop does not reproduce the source hold duration.':'Right-side demonstration; repeat on the other side.']};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');fs.writeFileSync(base+'/quadruped-notes.json',JSON.stringify(notes,null,2)+'\n');
fs.writeFileSync(base+'/quadruped-content.json',JSON.stringify(content,null,2)+'\n');
const mp='src/features/routine/exercise-methods.ts',gp='src/features/workout-timer/exercise-guides.ts';let m=fs.readFileSync(mp,'utf8'),g=fs.readFileSync(gp,'utf8');
for(const id of Object.keys(content))assert.ok(!m.includes(JSON.stringify(id)+':'),'Already inserted '+id);
const methods=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({equipment:x.equipment,steps:[x.setup,x.movement,x.tip]},null,2)).join(',\n');
const guides=Object.entries(content).map(([id,x])=>JSON.stringify(id)+': '+JSON.stringify({setup:x.setup,targets:[{name:x.target,feel:'몸통을 안정시키며 움직이는 느낌'}],cues:[x.movement,x.tip],beginnerTips:['손과 지지 무릎을 고정하고 천천히 움직인다']},null,2)).join(',\n');
assert.ok(m.includes('steps: string[] }> = {'));assert.ok(g.includes('const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {'));
fs.writeFileSync(mp,m.replace('steps: string[] }> = {','steps: string[] }> = {\n'+methods+','));
fs.writeFileSync(gp,g.replace('const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {\n'+guides+','));
