import {readFileSync,writeFileSync} from 'node:fs';
const rows=[
 ['dumbbell-rear-delt-row','dumbbell',['벤치에 앉아 상체를 앞으로 숙이고 손바닥이 뒤를 향하게 덤벨을 잡는다','상체를 고정하고 팔꿈치를 옆으로 벌려 몸통 높이까지 당긴다','팔꿈치를 천천히 펴 덤벨을 아래로 내린다'],'후면 삼각근','어깨 뒤쪽이 수축하는 느낌','상체 각도를 유지하고 팔꿈치를 옆으로 벌려 당기세요.'],
 ['scalene-neck-stretch','bodyweight',['앉아서 오른손을 왼쪽 어깨에 가볍게 얹고 어깨를 내린다','머리를 오른쪽으로 기울인 뒤 얼굴을 왼쪽으로 살짝 돌려 유지한다','얼굴을 정면으로 돌리고 머리를 세워 돌아온 뒤 반대쪽도 반복한다'],'사각근','목 옆이 부드럽게 늘어나는 느낌','손으로 머리를 당기지 말고 작은 범위에서 편안하게 호흡하세요.'],
 ['tempo-lateral-raise','dumbbell',['덤벨을 몸 옆에 들고 팔꿈치를 살짝 굽혀 선다','2초 동안 어깨 높이로 올려 1초 멈추고 3초 동안 내린다','팔꿈치 각도와 몸통을 안정시킨 채 같은 템포로 반복한다'],'측면 삼각근','어깨 바깥쪽에 긴장이 이어지는 느낌','가벼운 덤벨로 시작하고 어깨를 으쓱하거나 몸을 흔들지 마세요.'],
 ['high-cable-curl','cable',['양쪽 높은 풀리의 손잡이를 잡고 상완을 어깨 높이로 벌린다','상완을 수평으로 고정하고 팔꿈치를 굽혀 손잡이를 머리 쪽으로 당긴다','손목을 곧게 유지하며 팔꿈치를 천천히 펴 시작 범위로 돌아온다'],'이두근','팔 앞쪽이 수축하는 느낌','영상처럼 팔꿈치를 약간 굽힌 범위에서 시작하고 어깨 높이를 유지하세요.'],
];
const methodFile='src/features/routine/exercise-catalog-extra-methods.ts';
let methods=readFileSync(methodFile,'utf8');
for(const [id,equipment,steps] of rows){
 const re=new RegExp('  "'+id+'": \\{[\\s\\S]*?\\n  \\},');
 if(!re.test(methods))throw Error('Missing '+id);
 methods=methods.replace(re,`  "${id}": {\n    "${equipment}": ${JSON.stringify(steps,null,6)}\n  },`);
}
writeFileSync(methodFile,methods);
const guideFile='src/features/workout-timer/exercise-guides.ts';
let guides=readFileSync(guideFile,'utf8');
const entries=rows.map(([id,,steps,name,feel,tip])=>`  "${id}": ${JSON.stringify({setup:steps[0],targets:[{name,feel}],cues:steps.slice(1),beginnerTips:[tip]},null,4)},`).join('\n');
guides=guides.replace('const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {','$&\n'+entries);
guides=guides.replace('const EXERCISE_ONE_LINER: Record<string, string> = {','$&\n'+rows.map(([id,,steps])=>`  "${id}": ${JSON.stringify(steps[1])},`).join('\n'));
writeFileSync(guideFile,guides);
const captionFile='tests/be/logic/motion-caption.test.ts';
let caption=readFileSync(captionFile,'utf8').replace('"wide-grip-cable-curl", "cable-wrist-curl"]','"wide-grip-cable-curl", "cable-wrist-curl", "dumbbell-6-way-raise", "cable-drag-curl", "dumbbell-rear-delt-row", "high-cable-curl"]');
caption=caption.replace('    const ankleRock =',`    const scalene = motionSpecForUrl("/exercise-guides/ai-v3/scalene-neck-stretch.mp4");\n    expect(scalene?.timing).toBe("stretch");\n    expect(motionPhaseAt(3, scalene!)).toBe("peak");\n    const tempo = motionSpecForUrl("/exercise-guides/ai-v3/tempo-lateral-raise.mp4");\n    expect(tempo?.timing).toBe("continuous");\n    for (const time of [0, 2, 3.5, 6, 7.5]) expect(motionPhaseAt(time, tempo!)).toBe("move");\n    const ankleRock =`);
writeFileSync(captionFile,caption);
