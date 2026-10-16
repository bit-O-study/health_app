import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base='tools/media/imports/all-exercises-20261007/skinned-reuse-shoulders',out=base+'/native';
const original='tools/media/motion-refresh/skinned-3d';
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const ids=['alternating-dumbbell-shoulder-press','single-arm-dumbbell-front-raise','single-arm-dumbbell-lateral-raise'];
mkdirSync(base+'/dependencies',{recursive:true});
const dependencies=['node_modules/three/build/three.module.js','node_modules/three/build/three.core.js','node_modules/three/examples/jsm/environments/RoomEnvironment.js','node_modules/three/package.json'].map(origin=>{const path=base+'/dependencies/'+origin.split('/').at(-1);copyFileSync(origin,path);return {path,sha256:sha(path),origin};});
for(const id of ids){
 const previous=read(original+'/batch-3-reviews.json').find(x=>x.id===id);
 for(const input of previous.inputs)if(sha(original+'/'+input.file)!==input.sha256)throw Error('Changed original input');
 const themes=[];
 for(const suffix of ['','-dark']){
  const file=`${out}/${id}${suffix}.mp4`;
  execFileSync(ff,['-v','error','-i',file,'-f','null','-']);
  const v=JSON.parse(execFileSync(ff.replace('ffmpeg.exe','ffprobe.exe'),['-v','error','-show_streams','-of','json',file],{encoding:'utf8'})).streams[0];
  if(v.width!==480||v.height!==480||v.avg_frame_rate!=='24/1'||Number(v.nb_frames)!==192||Number(v.duration)!==8)throw Error('Unexpected format');
  execFileSync(ff,['-y','-v','error','-i',file,'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1',`${out}/${id}${suffix}-sheet.jpg`]);
  themes.push({file,suffix,sha256:sha(file),width:480,height:480,fps:24,frames:192,seconds:8,bytes:readFileSync(file).length,decode:'passed'});
 }
 execFileSync(ff,['-y','-v','error','-i',themes[0].file,'-vf','fps=2,scale=320:320,tile=4x4','-frames:v','1',`${out}/${id}.jpg`]);
 const sources=read(original+'/batch-3-sources.json').sources.filter(x=>x.id===id);
 const provenance={id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,light:'#fafafa',dark:'#09090b',phase:'renderSkinned(outputFrame*2.5)',interpolation:'none'},
  inputs:[base+'/render-3.mjs',base+'/studio-batch-3.mjs',original+'/exercise-motion-3.mjs',original+'/human.json'].map(path=>({path,sha256:sha(path)})),dependencies,
  originalSource:previous.inputs.map(x=>({path:original+'/'+x.file,sha256:x.sha256})),sourceUrls:sources.map(x=>x.url),sourceSummary:sources.map(x=>x.implementation).join(' '),sourceCheckedAt:new Date().toISOString(),sourceContact:{path:`${out}/${id}.jpg`,sha256:sha(`${out}/${id}.jpg`),panels:16,description:'Diagnostic frames, not interpolated input'},reproduction:`Set FFMPEG_PATH then node ${base}/render-3.mjs ${id}`};
 write(`${out}/${id}-provenance.json`,provenance);
 write(`${out}/${id}-candidate.json`,{id,status:'pending-visual-review',sourceSha256:sha(`${out}/${id}.jpg`),rigSourceSha256:sha(`${out}/${id}-provenance.json`),themes});
 execFileSync(process.execPath,[base+'/verify-playback.mjs',id],{stdio:'inherit'});
}
