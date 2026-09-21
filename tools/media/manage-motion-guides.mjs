import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, extname } from 'node:path';
import sharp from 'sharp';
import { selectReviewedGuides, REVIEW_CHECKS } from './guide-review.mjs';
import { motionPanelBounds } from './motion-panel-bounds.mjs';

const root=resolve('tools/media/motion-guides');
const out=resolve('public/exercise-guides/ai-v3');
const catalog=JSON.parse(readFileSync('tools/media/ai-guides/catalog.json','utf8'));
const read=(p,fallback=[])=>existsSync(p)?JSON.parse(readFileSync(p,'utf8')):fallback;
const write=(p,value)=>writeFileSync(p,JSON.stringify(value,null,2)+'\n');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const specPath=id=>join(root,id+'.json');
const imagePath=id=>join(root,id+'.jpg');
const moviePath=id=>join(out,id+'.mp4');
const reviewPath=join(root,'reviews.json');
const renderVersion=4;
const verifyPath=join(root,'verification.json');
const binDir=join(process.env.LOCALAPPDATA??'','Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
const bin=name=>existsSync(join(binDir,name+'.exe'))?join(binDir,name+'.exe'):name;
function artifacts() {
 return catalog.filter(x=>existsSync(imagePath(x.id))&&existsSync(moviePath(x.id))).map(x=>({
  id:x.id,sourceSha256:sha(imagePath(x.id)),videoSha256:sha(moviePath(x.id))
 }));
}
function publish() {
 const ids=selectReviewedGuides(read(reviewPath),artifacts());
 write(join(out,'manifest.json'),ids);
 return ids;
}
function coverage() {
 const registered=catalog.filter(x=>existsSync(specPath(x.id))).map(x=>x.id);
 const rendered=catalog.filter(x=>existsSync(moviePath(x.id))).map(x=>x.id);
 const reviewed=publish();
 const result={total:catalog.length,registered,rendered,reviewed,missing:catalog.filter(x=>!rendered.includes(x.id)).map(x=>x.id)};
 write(join(root,'coverage.json'),result);
 return result;
}
async function build(id) {
 const spec=read(specPath(id),null);
 if(!spec) throw Error('No registered motion sheet: '+id);
 const frames=join(root,id);
 mkdirSync(frames,{recursive:true});
 const panelCount=spec.panels??8;
 const rows=panelCount/4;
 const sourceSha256=sha(imagePath(id));
 const previous=read(verifyPath);
 const cached=previous.find(x=>x.id===id&&x.renderVersion===renderVersion&&x.sourceSha256===sourceSha256&&(x.panels??8)===panelCount&&existsSync(moviePath(id))&&x.videoSha256===sha(moviePath(id)));
 if(cached) return console.log(id+': verified movie already current');
 const {data,info}=await sharp(imagePath(id)).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const bounds=motionPanelBounds(data,info.width,info.height,info.channels,rows);
 const poses=[];
 for(let i=0;i<panelCount;i++){
  poses.push(await sharp(imagePath(id)).extract(bounds[i])
   .resize(480,480,{fit:'contain',background:'#b6b6b6'}).jpeg({quality:94}).toBuffer());
 }
 const order=panelCount===16?[0,0,...Array.from({length:16},(_,i)=>i),15,15,...Array.from({length:16},(_,i)=>15-i),0,0,0,0]:spec.cycle==='full'?[0,0,1,2,3,4,5,6,7,7,0,0,1,2,3,4,5,6,7,7]:[0,0,1,2,3,4,5,6,7,7,6,5,4,3,2,1,0,0,0,0];
 for(let i=0;i<order.length;i++)writeFileSync(join(frames,String(i+1).padStart(3,'0')+'.jpg'),poses[order[i]]);
 const filter='scale=in_range=full:out_range=tv,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,minterpolate=fps=24:mi_mode=mci:mc_mode=obmc:me_mode=bidir:mb_size=16:search_param=32:vsbmc=0:scd=none';
 execFileSync(bin('ffmpeg'),['-y','-v','error','-framerate',panelCount===16?'5':'5/2','-t','8','-i',join(frames,'%03d.jpg'),'-vf',filter,'-t','8','-c:v','libx264','-preset','slow','-crf','28','-profile:v','main','-pix_fmt','yuv420p','-movflags','+faststart','-an',moviePath(id)],{stdio:'inherit'});
 execFileSync(bin('ffmpeg'),['-v','error','-i',moviePath(id),'-f','null','-'],{stdio:'pipe'});
 const meta=JSON.parse(execFileSync(bin('ffprobe'),['-v','error','-show_streams','-show_format','-of','json',moviePath(id)],{encoding:'utf8'}));
 const v=meta.streams[0];
 if(meta.streams.length!==1||v.width!==480||v.height!==480||v.pix_fmt!=='yuv420p'||v.avg_frame_rate!=='24/1'||Math.abs(Number(meta.format.duration)-8)>0.05)throw Error('Unexpected motion format');
 execFileSync(bin('ffmpeg'),['-y','-v','error','-i',moviePath(id),'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',join(frames,'contact-sheet.jpg')],{stdio:'inherit'});
 const entry={id,renderVersion,panels:panelCount,sourceSha256,videoSha256:sha(moviePath(id)),width:480,height:480,seconds:8,fps:24,bytes:statSync(moviePath(id)).size,decode:'passed',verifiedAt:new Date().toISOString()};
 write(verifyPath,[...previous.filter(x=>x.id!==id),entry]);
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
  if(spec.panels===16&&spec.cycle==='full')throw Error('16 panels currently require reverse cycle');
  if(spec.cycle&&!['full','reverse'].includes(spec.cycle))throw Error('Invalid cycle');
  await sharp(source).removeAlpha().jpeg({quality:92}).toFile(imagePath(id));
  write(specPath(id),{...spec,id,registeredAt:new Date().toISOString()});
  publish();console.log(id+': motion source registered');
 }else if(command==='motion-build'){
  await build(id);coverage();
 }else if(command==='motion-inspect'){
  const path=arg==='source'?imagePath(id):join(root,id,'contact-sheet.jpg');
  const data=await sharp(path).resize({width:1920,withoutEnlargement:true}).jpeg({quality:80}).toBuffer();
  console.log('data:image/jpeg;base64,'+data.toString('base64'));
 }else if(command==='motion-review'){
  if(!existsSync(moviePath(id)))throw Error('Render before reviewing');
  const entry=JSON.parse(decodeURIComponent(arg)),spec=read(specPath(id));
  if(!['passed','rejected','pending'].includes(entry.status))throw Error('Invalid review status');
  if(entry.status==='passed'&&!REVIEW_CHECKS.every(k=>typeof entry.checks?.[k]==='string'&&entry.checks[k].trim()))throw Error('Inspect all six content checks');
  const reviews=read(reviewPath);
  write(reviewPath,[...reviews.filter(x=>x.id!==id),{...entry,id,equipmentIds:[spec.equipment],sources:spec.sources,sourceSha256:sha(imagePath(id)),videoSha256:sha(moviePath(id)),reviewedAt:new Date().toISOString()}]);
  console.log(id+': '+entry.status+'; '+publish().length+' motion videos reviewed');
  coverage();
 }else throw Error('Unknown motion command');
}
