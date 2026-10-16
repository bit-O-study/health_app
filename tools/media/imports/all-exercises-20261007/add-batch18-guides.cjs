const fs=require('fs');
const path='src/features/workout-timer/exercise-guides.ts';
let text=fs.readFileSync(path,'utf8');
const rows=[
['wide-grip-bench-press','평평한 벤치에 누워 발바닥을 바닥에 두고 바벨을 어깨너비보다 넓게 오버핸드로 잡으세요.','대흉근','바벨을 위로 밀 때 가슴에 힘이 들어가요.',['바벨을 가슴까지 천천히 내리세요.','등과 엉덩이를 벤치에 유지하고 가슴에서 튕기지 마세요.'],'넓은 그립을 편안하게 유지할 수 있는 가벼운 무게로 시작하세요.','바벨을 넓게 잡고 가슴까지 내렸다 밀어 올려요.'],
['spoto-press','평평한 벤치에 누워 양발을 바닥에 두고 오버핸드로 바벨을 잡으세요.','대흉근','가슴 위에서 멈추는 동안 가슴과 팔의 긴장이 이어져요.',['가슴 위 약 3~5cm에서 닿지 않도록 1초 멈추세요.','몸통 긴장을 유지하고 바벨을 위로 밀어 올리세요.'],'가벼운 무게로 공중 정지 위치부터 익히세요.','가슴 위에서 닿지 않게 1초 멈춘 뒤 바벨을 밀어 올려요.'],
['machine-biceps-curl','머신에 앉아 양쪽 상완을 경사 패드에 대고 손바닥이 위를 향하도록 손잡이를 잡으세요.','이두근','팔꿈치를 굽히면 위팔 앞쪽이 수축해요.',['상완을 패드에 유지하며 손잡이를 올리세요.','몸통 반동 없이 천천히 내리세요.'],'팔꿈치를 강하게 잠그지 말고 가벼운 무게로 시작하세요.','상완을 패드에 대고 양손잡이를 어깨 쪽으로 올려요.'],
['doorway-chest-stretch','문틀 옆에서 한쪽 팔꿈치를 어깨높이로 90도 굽혀 전완을 대고 같은 쪽 발을 앞으로 두세요.','대흉근','몸을 앞으로 이동하면 가슴 앞쪽이 편안하게 늘어나요.',['전완과 발을 고정하고 몸을 천천히 앞으로 이동하세요.','어깨를 으쓱하거나 허리를 과하게 꺾지 마세요.'],'편안한 범위에서 유지한 뒤 반대쪽도 반복하세요.','전완을 문틀에 대고 몸을 앞으로 이동해 가슴을 늘려요.'],
['hip-circle','양발을 골반너비로 벌려 바닥에 붙이고 무릎을 부드럽게 둔 채 서세요.','고관절 주변','골반을 돌릴 때 고관절 주변이 부드럽게 움직여요.',['양발을 고정하고 골반으로 작은 원을 그리세요.','한 방향을 마친 뒤 반대 방향도 반복하세요.'],'허리를 과하게 꺾지 말고 천천히 작은 범위로 시작하세요.','양발을 바닥에 둔 채 골반으로 천천히 원을 그려요.']
];
for(const [id] of rows)if(text.includes('"'+id+'":'))throw Error('Existing '+id);
const guides=rows.map(([id,setup,name,feel,cues,tip])=>'  '+JSON.stringify(id)+': '+JSON.stringify({setup,targets:[{name,feel}],cues,beginnerTips:[tip]},null,2)+',').join('\n');
const liners=rows.map(r=>'  '+JSON.stringify(r[0])+': '+JSON.stringify(r[6])+',').join('\n');
for(const [marker,addition] of [['const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {',guides],['const EXERCISE_ONE_LINER: Record<string, string> = {',liners]]){if(!text.includes(marker))throw Error('Missing marker');text=text.replace(marker,marker+'\n'+addition);}
fs.writeFileSync(path,text);
