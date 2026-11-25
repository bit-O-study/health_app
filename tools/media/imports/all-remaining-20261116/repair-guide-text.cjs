const fs = require('node:fs');
const entries = {
  'side-lying-quad-stretch': ['옆으로 누워 아래쪽 팔로 머리를 받칩니다. 위쪽 무릎을 굽히고 같은 쪽 손으로 발목을 잡습니다.', '허벅지를 바닥과 거의 평행하게 유지하고 뒤꿈치를 엉덩이 쪽으로 부드럽게 당긴 자세를 유지합니다.', '무릎에 무리가 가도록 당기지 않고 허리를 젖히지 않습니다. 천천히 풀고 반대쪽도 반복합니다.', '허벅지 앞쪽', '위쪽 허벅지 앞면이 부드럽게 늘어나는 느낌'],
  'side-lying-external-rotation': ['옆으로 누워 아래쪽 팔로 머리를 받칩니다. 위쪽 손에 가벼운 덤벨을 쥐고 팔꿈치를 직각으로 굽혀 옆구리에 둡니다.', '위팔과 팔꿈치를 제자리에 둔 채 덤벨을 위로 돌려 올렸다가 천천히 내립니다.', '몸통을 뒤로 굴리지 않고 손목을 곧게 유지합니다. 편안하게 움직일 수 있는 가벼운 무게를 사용합니다.', '어깨 뒤쪽', '팔꿈치를 고정하고 전완을 바깥으로 회전시키는 느낌'],
  'side-lying-hip-abduction': ['옆으로 누워 아래쪽 팔로 머리를 받칩니다. 두 다리를 펴고 골반과 어깨를 포개며 위쪽 손을 골반에 둡니다.', '골반을 뒤로 굴리지 않고 위쪽 다리만 천천히 들었다 내립니다. 무릎을 펴고 발끝이 앞을 향하게 유지합니다.', '다리를 높이 들려고 허리를 옆으로 꺾지 않습니다. 한쪽을 마치면 반대쪽으로 돌아누워 반복합니다.', '엉덩이 옆쪽', '몸통을 고정한 채 위쪽 다리를 들어 올리는 느낌'],
  'heel-touch': ['바로 누워 무릎을 굽히고 두 발을 바닥에 댑니다. 양팔을 몸 옆으로 뻗고 어깨를 조금 들어 올립니다.', '발과 골반을 고정하고 몸통을 왼쪽으로 굽혀 왼손을 왼쪽 뒤꿈치에 댑니다. 가운데로 돌아와 오른쪽도 반복합니다.', '턱을 가슴에 붙이지 말고 목을 편안하게 둡니다. 팔만 흔들지 않고 몸통을 좌우로 움직입니다.', '복부와 옆구리', '몸통을 좌우로 굽히며 같은 쪽 뒤꿈치에 손을 뻗는 느낌'],
  'flutter-kick': ['매트에 바로 누워 양팔을 몸 옆에 두고 손바닥을 댑니다. 두 다리를 곧게 펴 바닥에서 띄웁니다.', '몸통을 고정하고 두 다리를 작은 범위로 위아래 번갈아 움직입니다.', '허리가 뜨면 다리 높이를 올리거나 범위를 줄이세요. 목은 편안히 둡니다.', '복부', '다리가 움직이는 동안 몸통을 고정하는 느낌'],
  'scissor-kick': ['매트에 바로 누워 양팔을 몸 옆에 두고 손바닥을 댑니다. 두 다리를 곧게 펴 바닥에서 띄웁니다.', '다리를 옆으로 벌렸다가 교차합니다. 다음 교차에서는 반대쪽 다리가 위로 지나가게 합니다.', '허리를 바닥에 지지하고 다리를 부딪치지 않게 천천히 교차합니다.', '복부', '다리를 교차하면서 골반과 몸통을 고정하는 느낌'],
  'lying-leg-raise': ['매트에 바로 누워 양팔을 몸 옆에 두고 손바닥을 바닥에 댑니다. 두 다리를 곧게 펴 수직으로 올립니다.', '허리가 뜨지 않는 범위에서 두 다리를 함께 천천히 내렸다가 다시 올립니다.', '무릎을 편 상태로 움직이고 다리를 내릴 때 허리를 꺾지 마세요.', '복부', '다리를 내리는 동안 몸통을 고정하는 느낌'],
  'legs-up-the-wall-pose': ['벽 옆에 누워 두 다리를 벽에 올립니다. 엉덩이는 편안한 거리를 두고 머리 아래에는 낮은 수건을 받칩니다.', '다리를 편 채 벽에 기대고 양팔은 몸 옆에 손바닥을 위로 둡니다. 편안하게 호흡하며 자세를 유지합니다.', '마칠 때 무릎을 굽히고 옆으로 돌아누운 뒤 천천히 일어납니다.', '다리 뒤쪽', '벽에 다리를 맡기고 힘을 편안하게 푸는 느낌'],
  'glute-bridge-march': ['바로 누워 무릎을 굽히고 발바닥을 골반 너비로 댑니다. 양팔을 몸 옆에 놓고 엉덩이를 들어 브리지 자세를 만듭니다.', '골반 높이를 유지하면서 한쪽 발을 조금 들었다 내립니다. 반대쪽도 같은 방법으로 번갈아 움직입니다.', '지지하는 발과 어깨를 바닥에 두고 골반이 좌우로 기울지 않게 합니다.', '엉덩이와 복부', '한 발로 버티며 골반을 수평으로 유지하는 느낌'],
  'bridge-pose': ['바로 누워 무릎을 굽히고 두 발을 골반 너비로 둡니다. 양팔은 몸 옆에 놓고 손바닥을 바닥에 댑니다.', '발바닥으로 바닥을 밀어 엉덩이를 들어 올립니다. 어깨와 머리를 편안히 둔 채 자세를 유지합니다.', '고개를 돌리지 않고 호흡합니다. 마칠 때 엉덩이를 천천히 내립니다.', '엉덩이와 허벅지 뒤', '발로 바닥을 누르며 엉덩이를 들어 유지하는 느낌'],
  'locust-pose': ['배를 대고 누워 양팔을 몸 옆으로 뻗습니다. 다리를 곧게 펴고 목은 몸통과 자연스럽게 잇습니다.', '배를 지지점으로 삼아 가슴과 팔, 두 다리를 조금 들어 유지합니다.', '높이 들려고 목이나 허리를 꺾지 말고 편안하게 호흡합니다.', '등과 엉덩이', '몸의 뒤쪽에 힘을 주며 팔다리를 길게 뻗는 느낌'],
  'scapular-dip': ['평행봉을 잡고 팔을 편 채 몸을 지지합니다. 다리는 모아 바닥에서 띄웁니다.', '팔꿈치를 편 상태로 어깨를 아래로 눌러 몸을 조금 올렸다가 천천히 되돌립니다.', '팔꿈치를 굽히거나 몸을 앞뒤로 흔들지 않습니다.', '견갑 주변', '어깨를 귀에서 멀리하며 몸을 지지하는 느낌'],
  'forward-lean-dip': ['평행봉을 잡고 몸을 지지한 뒤 상체를 앞으로 기울입니다. 무릎을 굽혀 발을 바닥에서 띄웁니다.', '상체 기울기를 유지하며 팔꿈치를 굽혀 내려갔다가 봉을 밀어 올라옵니다.', '어깨가 불편하지 않은 깊이까지만 내리고 반동을 쓰지 않습니다.', '가슴과 삼두', '팔꿈치를 펴면서 몸을 밀어 올리는 느낌'],
  'close-grip-dip': ['간격이 좁은 평행봉을 잡고 몸을 세웁니다. 다리를 모아 펴고 발을 바닥에서 띄웁니다.', '팔꿈치를 몸 가까이에 두고 천천히 내려갔다가 봉을 눌러 올라옵니다.', '손목과 어깨가 편안한 간격을 사용하고 반동을 쓰지 않습니다.', '삼두', '팔 뒤쪽으로 몸을 밀어 올리는 느낌'],
  'wide-grip-dip': ['간격이 넓은 평행봉을 잡고 몸을 지지합니다. 상체를 조금 기울이고 무릎을 굽힙니다.', '팔꿈치를 굽혀 천천히 내려갔다가 봉을 밀어 올라옵니다.', '어깨가 불편하지 않은 깊이까지만 움직이고 몸을 흔들지 않습니다.', '가슴과 삼두', '가슴과 팔에 힘을 주며 몸을 밀어 올리는 느낌'],
};
const methodFile='src/features/routine/exercise-methods.ts',guideFile='src/features/workout-timer/exercise-guides.ts';
let methods=fs.readFileSync(methodFile,'utf8'),guides=fs.readFileSync(guideFile,'utf8');
function put(text,id,value,anchor){const block='  '+JSON.stringify(id)+': '+JSON.stringify(value,null,2).replace(/\n/g,'\n  ')+',\n';const pattern=new RegExp('  "'+id+'": \\{[\\s\\S]*?\\n  \\},\\r?\\n');return pattern.test(text)?text.replace(pattern,block):text.replace(anchor,anchor+'\n'+block);}
for(const [id,[setup,cue,tip,name,feel]] of Object.entries(entries)){methods=put(methods,id,{equipment:id==='side-lying-external-rotation'?'dumbbell':'bodyweight',steps:[setup,cue,tip]},'const REVIEWED_RESISTANCE_METHODS: Record<string, { equipment: EquipmentId; steps: string[] }> = {');guides=put(guides,id,{setup,targets:[{name,feel}],cues:[cue],beginnerTips:[tip]},'const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {');}
const fixes={
 'prone-l-raise':['배를 대고 누워 가벼운 덤벨을 잡습니다. 위팔을 옆으로 벌리고 팔꿈치를 직각으로 굽혀 L 모양을 만듭니다.'],
 'reverse-snow-angel':['배를 대고 누워 두 다리를 편 채 몸통을 안정시킵니다. 양팔을 바닥에서 조금 띄웁니다.','팔꿈치를 편 채 양팔을 머리 위에서 몸 옆까지 큰 원을 그리듯 움직입니다.'],
 'wide-cable-face-pull':['케이블을 얼굴 높이에 맞추고 로프의 양 끝을 잡습니다. 발을 안정적으로 딛고 몸통을 세웁니다.']
};
for(const [id,lines]of Object.entries(fixes)){const pattern=new RegExp('  "'+id+'": \\{[\\s\\S]*?\\n  \\},');for(const key of ['methods','guides']){let n=0;const repair=s=>s.replace(/"[^"\r\n]*\?[^"\r\n]*"/g,()=>JSON.stringify(lines[n++]));if(key==='methods')methods=methods.replace(pattern,repair);else guides=guides.replace(pattern,repair);}}
for(const [file,text]of [[methodFile,methods],[guideFile,guides]]){if(/"[^"\r\n]*\?\?[^"\r\n]*"/.test(text))throw Error('Unrepaired text: '+file);if(!text.includes('두 다리를 곧게'))throw Error('Missing Korean addition');fs.writeFileSync(file,text,'utf8');}
