import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { selectReviewedDarkGuides, selectReviewedGuides, REVIEW_CHECKS } from './guide-review.mjs';

const root=resolve('tools/media/motion-guides');
const out=resolve('public/exercise-guides/ai-v3');
const catalog=JSON.parse(readFileSync('tools/media/ai-guides/catalog.json','utf8'));
const read=(p,fallback=[])=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):fallback;
const write=(p,value)=>writeFileSync(p,JSON.stringify(value,null,2)+'\n');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const specPath=id=>join(root,id+'.json');
const imagePath=id=>join(root,id+'.jpg');
const moviePath=id=>join(out,id+'.mp4');
// 누끼 영상은 운동모드 테마별 배경색으로 두 벌: ID.mp4(라이트 #fafafa) + ID-dark.mp4(다크 #09090b + 윤곽광)
const darkMoviePath=id=>join(out,id+'-dark.mp4');
const reviewPath=join(root,'reviews.json');
const renderVersion=5;
const verifyPath=join(root,'verification.json');
const binDir=join(process.env.LOCALAPPDATA??'','Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
const bin=name=>existsSync(join(binDir,name+'.exe'))?join(binDir,name+'.exe'):name;
const cutoutScript=fileURLToPath(new URL('motion-cutout.py',import.meta.url));
// GPU 환경(.venv-cutout-gpu)이 CUDA 동작 확인(ready 표식)까지 끝났으면 우선 — CPU 대비 누끼가 훨씬 빠르다
const venvPython=name=>fileURLToPath(new URL(name+'/Scripts/python.exe',import.meta.url));
const gpuReady=existsSync(fileURLToPath(new URL('.venv-cutout-gpu/ready',import.meta.url)));
const cutoutPython=process.env.MOTION_CUTOUT_PYTHON??(gpuReady?venvPython('.venv-cutout-gpu'):venvPython('.venv-cutout'));
function artifacts() {
 return catalog.filter(x=>existsSync(imagePath(x.id))&&existsSync(moviePath(x.id))).map(x=>({
  id:x.id,sourceSha256:sha(imagePath(x.id)),videoSha256:sha(moviePath(x.id)),
  ...(existsSync(darkMoviePath(x.id))?{darkVideoSha256:sha(darkMoviePath(x.id))}:{})
 }));
}
function publish() {
 const reviewed=selectReviewedGuides(read(reviewPath),artifacts());
 write(join(out,'manifest.json'),reviewed);
 // 다크 영상이 있는(누끼) 종목 — 앱은 이 종목만 테마별 영상 + 박스 없는 화면으로 보여준다
 write(join(out,'manifest-dark.json'),selectReviewedDarkGuides(read(reviewPath),artifacts()));
 return reviewed;
}
function renderMovie(framesDir,panelCount,target,sheetPath){
 const filter='scale=in_range=full:out_range=tv,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,minterpolate=fps=24:mi_mode=mci:mc_mode=obmc:me_mode=bidir:mb_size=16:search_param=32:vsbmc=0:scd=none';
 execFileSync(bin('ffmpeg'),['-y','-v','error','-framerate',panelCount===16?'5':'5/2','-t','8','-i',join(framesDir,'%03d.jpg'),'-vf',filter,'-t','8','-c:v','libx264','-preset','slow','-crf','22','-profile:v','main','-pix_fmt','yuv420p','-movflags','+faststart','-an',target],{stdio:'inherit'});
 execFileSync(bin('ffmpeg'),['-v','error','-i',target,'-f','null','-'],{stdio:'pipe'});
 const meta=JSON.parse(execFileSync(bin('ffprobe'),['-v','error','-show_streams','-show_format','-of','json',target],{encoding:'utf8'}));
 const v=meta.streams[0];
 if(meta.streams.length!==1||v.width!==480||v.height!==480||v.pix_fmt!=='yuv420p'||v.avg_frame_rate!=='24/1'||Math.abs(Number(meta.format.duration)-8)>0.05)throw Error('Unexpected motion format');
 execFileSync(bin('ffmpeg'),['-y','-v','error','-i',target,'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',sheetPath],{stdio:'inherit'});
 return {sha256:sha(target),bytes:statSync(target).size};
}
function coverage() {
 const registered=catalog.filter(x=>existsSync(specPath(x.id))).map(x=>x.id);
 const rendered=catalog.filter(x=>existsSync(moviePath(x.id))).map(x=>x.id);
 const reviewed=publish();
 const result={total:catalog.length,registered,rendered,reviewed,missing:catalog.filter(x=>!rendered.includes(x.id)).map(x=>x.id)};
 write(join(root,'coverage.json'),result);
 return result;
}
// 같은 종목을 두 세션이 동시에 빌드하면 서로 포즈·프레임 폴더를 지워 실패한다 → 종목별 잠금
function pidAlive(pid){try{process.kill(pid,0);return true;}catch(error){return error.code==='EPERM';}}
async function build(id) {
 const spec=read(specPath(id),null);
 if(!spec) throw Error('No registered motion sheet: '+id);
 const frames=join(root,id);
 mkdirSync(frames,{recursive:true});
 const lockPath=join(frames,'.build-lock');
 if(existsSync(lockPath)){
  const owner=Number(readFileSync(lockPath,'utf8'));
  if(owner&&owner!==process.pid&&pidAlive(owner))throw Error('BUSY: '+id+' is being built by pid '+owner);
 }
 writeFileSync(lockPath,String(process.pid));
 try{return await buildLocked(id,spec,frames);}
 finally{if(existsSync(lockPath)&&readFileSync(lockPath,'utf8')===String(process.pid))rmSync(lockPath,{force:true});}
}
async function buildLocked(id,spec,frames) {
 const panelCount=spec.panels??8;
 const rows=panelCount/4;
 // 기본은 누끼(운동모드 배경색 라이트/다크 두 벌). spec.cutout===false 면 예전 회색 여백 한 벌.
 const cutout=spec.cutout!==false;
 const sourceSha256=sha(imagePath(id));
 const previous=read(verifyPath);
 const cached=previous.find(x=>x.id===id&&x.renderVersion===renderVersion&&x.sourceSha256===sourceSha256&&(x.panels??8)===panelCount&&Boolean(x.cutout)===cutout&&existsSync(moviePath(id))&&x.videoSha256===sha(moviePath(id))&&(!cutout||existsSync(darkMoviePath(id))&&x.darkVideoSha256===sha(darkMoviePath(id))));
 if(cached) return console.log(id+': verified movie already current');
 const posesByTheme={};
 if(cutout){
  if(!existsSync(cutoutPython))throw Error('Cutout environment missing: python -m venv tools/media/.venv-cutout && tools/media/.venv-cutout/Scripts/python -m pip install -r tools/media/requirements-cutout.txt');
  execFileSync(cutoutPython,[cutoutScript,imagePath(id),String(panelCount),frames],{stdio:'inherit',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  for(const theme of ['light','dark'])posesByTheme[theme]=Array.from({length:panelCount},(_,i)=>readFileSync(join(frames,'poses-'+theme,(i+1)+'.jpg')));
 }else{
  const {width,height}=await sharp(imagePath(id)).metadata();
  posesByTheme.light=[];
  for(let i=0;i<panelCount;i++){
   const left=Math.round(i%4*width/4)+4,top=Math.round(Math.floor(i/4)*height/rows)+4;
   const right=Math.round((i%4+1)*width/4)-4,bottom=Math.round((Math.floor(i/4)+1)*height/rows)-4;
   posesByTheme.light.push(await sharp(imagePath(id)).extract({left,top,width:right-left,height:bottom-top})
    .resize(480,480,{fit:'contain',background:'#b6b6b6'}).jpeg({quality:94}).toBuffer());
  }
  rmSync(darkMoviePath(id),{force:true});
 }
 // 16자세 full: 원본 16장이 한 주기 전체(시작→끝→시작 직전)를 담으므로 되감지 않고 그대로 두 번 재생한다.
 // 전반부와 후반부가 다른 동작(점프·보행·좌우 교대·그립 전환)은 reverse 로 만들면 거꾸로 재생돼 틀린 운동이 된다.
 // reverse 와 마찬가지로 40프레임이라 framerate 5 에서 정확히 8초.
 const cycle16=[0,0,0,...Array.from({length:15},(_,i)=>i+1),15,15];
 const order=panelCount===16?(spec.cycle==='full'?[...cycle16,...cycle16]:[0,0,...Array.from({length:16},(_,i)=>i),15,15,...Array.from({length:16},(_,i)=>15-i),0,0,0,0]):spec.cycle==='full'?[0,0,1,2,3,4,5,6,7,7,0,0,1,2,3,4,5,6,7,7]:[0,0,1,2,3,4,5,6,7,7,6,5,4,3,2,1,0,0,0,0];
 const results={};
 for(const [theme,poses] of Object.entries(posesByTheme)){
  // 테마마다 빈 폴더에서 시작 — 이전(16자세) 렌더의 남은 프레임이 섞여 보간되지 않게
  const framesDir=join(frames,'frames-'+theme);
  rmSync(framesDir,{recursive:true,force:true});mkdirSync(framesDir,{recursive:true});
  for(let i=0;i<order.length;i++)writeFileSync(join(framesDir,String(i+1).padStart(3,'0')+'.jpg'),poses[order[i]]);
  results[theme]=renderMovie(framesDir,panelCount,theme==='dark'?darkMoviePath(id):moviePath(id),join(frames,theme==='dark'?'contact-sheet-dark.jpg':'contact-sheet.jpg'));
 }
 const entry={id,renderVersion,panels:panelCount,cutout,sourceSha256,videoSha256:results.light.sha256,...(results.dark?{darkVideoSha256:results.dark.sha256,darkBytes:results.dark.bytes}:{}),width:480,height:480,seconds:8,fps:24,bytes:results.light.bytes,decode:'passed',verifiedAt:new Date().toISOString()};
 // 렌더 중(수 분) 다른 세션이 쓴 기록을 덮지 않도록 쓰기 직전에 다시 읽는다
 write(verifyPath,[...read(verifyPath).filter(x=>x.id!==id),entry]);
 publish();
 console.log(JSON.stringify(entry));
}
export async function manageMotionGuides(command,id,arg,specArg){
 mkdirSync(root,{recursive:true});mkdirSync(out,{recursive:true});
 if(!existsSync(join(root,'.gitignore')))writeFileSync(join(root,'.gitignore'),'*/\n');
 if(command==='motion-checkpoint'){
  const note=decodeURIComponent(id??'');
  if(!note.trim()||note.length>8000)throw Error('Provide a concise progress note');
  const c=coverage();
  const path=resolve('docs/EXERCISE-VIDEO-RESUME.md');
  const marker='## 최신 체크포인트';
  const base=readFileSync(path,'utf8').split(marker)[0].trimEnd();
  writeFileSync(path,base+'\n\n'+marker+'\n\n'+new Date().toISOString()+'\n\n등록 '+c.registered.length+' / 렌더 '+c.rendered.length+' / 시각 검토 통과 '+c.reviewed.length+' / 대상 '+c.total+'\n\n'+note+'\n');
  console.log('Motion checkpoint saved: '+c.reviewed.length+' reviewed');
  return;
 }
 if(command==='motion-list'||command==='motion-coverage'){
  const c=coverage();
  console.log(JSON.stringify(command==='motion-list'?{total:c.total,rendered:c.rendered.length,reviewed:c.reviewed.length,next:catalog.filter(x=>!c.registered.includes(x.id)).slice(0,Number(id)||20)}:{total:c.total,registered:c.registered.length,rendered:c.rendered.length,reviewed:c.reviewed.length}));
  return;
 }
 if(command==='motion-build'&&!id){
  for(const x of catalog.filter(x=>existsSync(specPath(x.id))))await build(x.id);
  coverage();return;
 }
 const exercise=catalog.find(x=>x.id===id);
 if(!exercise||!/^[a-z0-9-]+$/.test(id))throw Error('Unknown exercise');
 if(command==='motion-register'){
  const source=resolve(arg),rel=relative(resolve(process.env.USERPROFILE,'.codex/generated_images'),source);
  if(rel.startsWith('..')||isAbsolute(rel)||extname(source)!=='.png')throw Error('Expected generated PNG');
  const spec=JSON.parse(decodeURIComponent(specArg));
  const allowed=exercise.equipments.map(x=>typeof x==='string'?x:x.equipment);
  if(!spec.prompt||spec.prompt.length>16000||!Array.isArray(spec.sources)||!spec.sources.length||!spec.sources.every(x=>x.startsWith('https://'))||!allowed.includes(spec.equipment))throw Error('Provide exact prompt, sources and matching equipment');
  if(spec.panels!==undefined&&![8,16].includes(spec.panels))throw Error('Expected 8 or 16 panels');
  if(spec.cycle&&!['full','reverse'].includes(spec.cycle))throw Error('Invalid cycle');
  await sharp(source).removeAlpha().jpeg({quality:92}).toFile(imagePath(id));
  write(specPath(id),{...spec,id,registeredAt:new Date().toISOString()});
  publish();console.log(id+': motion source registered');
 }else if(command==='motion-build'){
  await build(id);coverage();
 }else if(command==='motion-inspect'){
  const path=arg==='source'?imagePath(id):join(root,id,arg==='dark'?'contact-sheet-dark.jpg':'contact-sheet.jpg');
  const data=await sharp(path).resize({width:1920,withoutEnlargement:true}).jpeg({quality:80}).toBuffer();
  console.log('data:image/jpeg;base64,'+data.toString('base64'));
 }else if(command==='motion-review'){
  if(!existsSync(moviePath(id)))throw Error('Render before reviewing');
  const entry=JSON.parse(decodeURIComponent(arg)),spec=read(specPath(id));
  if(!['passed','rejected','pending'].includes(entry.status))throw Error('Invalid review status');
  if(entry.status==='passed'&&!REVIEW_CHECKS.every(k=>typeof entry.checks?.[k]==='string'&&entry.checks[k].trim()))throw Error('Inspect all six content checks');
  const reviews=read(reviewPath);
  write(reviewPath,[...reviews.filter(x=>x.id!==id),{...entry,id,equipmentIds:[spec.equipment],sources:spec.sources,sourceSha256:sha(imagePath(id)),videoSha256:sha(moviePath(id)),...(existsSync(darkMoviePath(id))?{darkVideoSha256:sha(darkMoviePath(id))}:{}),reviewedAt:new Date().toISOString()}]);
  console.log(id+': '+entry.status+'; '+publish().length+' motion videos reviewed');
  coverage();
 }else throw Error('Unknown motion command');
}
