const fs=require('fs');
const methods='src/features/routine/exercise-catalog-extra-methods.ts';let s=fs.readFileSync(methods,'utf8').replace(/\r\n/g,'\n');
const pattern=/  "pause-bench-press": \{\s+"barbell": \[[\s\S]*?\n    \]\n  \}/;
if(!pattern.test(s))throw Error('missing methods');
s=s.replace(pattern,'  "pause-bench-press": '+JSON.stringify({barbell:['평평한 벤치에 누워 발바닥을 바닥에 두고 바벨을 오버핸드로 잡는다','바벨을 천천히 내려 가슴에 가볍게 닿은 상태에서 1초 멈춘다','등과 엉덩이를 벤치에 유지하며 가슴에서 튕기지 않고 위로 밀어 올린다']},null,2));fs.writeFileSync(methods,s);
const p='src/features/workout-timer/exercise-guides.ts';s=fs.readFileSync(p,'utf8');
for(const [id,line] of Object.entries({'wide-grip-bench-press':'바벨을 넓게 잡고 가슴까지 내렸다 밀어 올려요.','spoto-press':'가슴 위에서 닿지 않게 1초 멈춘 뒤 바벨을 밀어 올려요.','machine-biceps-curl':'상완을 패드에 대고 양손잡이를 어깨 쪽으로 올려요.','doorway-chest-stretch':'전완을 문틀에 대고 몸을 앞으로 이동해 가슴을 늘려요.','hip-circle':'양발을 바닥에 둔 채 골반으로 천천히 원을 그려요.'})){
 const old='"'+id+'": undefined';if(!s.includes(old))throw Error('missing bad liner '+id);s=s.replace(old,'"'+id+'": '+JSON.stringify(line));
}
const guide={setup:'평평한 벤치에 누워 발바닥을 바닥에 두고 바벨을 오버핸드로 잡으세요.',targets:[{name:'대흉근',feel:'가슴에 멈춘 바벨을 밀어 올릴 때 가슴에 힘이 들어가요.'}],cues:['가슴에 가볍게 닿은 상태에서 1초 멈추세요.','가슴에서 튕기지 말고 등과 엉덩이를 벤치에 유지하세요.'],beginnerTips:['가슴에 무게를 내려놓지 말고 몸통 긴장을 유지하세요.']};
if(s.includes('"pause-bench-press":'))throw Error('existing');
s=s.replace('const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {','const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {\n  "pause-bench-press": '+JSON.stringify(guide,null,2)+',');
s=s.replace('const EXERCISE_ONE_LINER: Record<string, string> = {','const EXERCISE_ONE_LINER: Record<string, string> = {\n  "pause-bench-press": "가슴에 가볍게 닿은 바벨을 1초 멈춘 뒤 밀어 올려요.",');fs.writeFileSync(p,s);
