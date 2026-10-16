const fs=require('fs'),crypto=require('crypto'),cp=require('child_process');
const base='tools/media/imports/all-exercises-20261007/skinned-wrist-next/',dir=base+'native/',ids=['barbell-wrist-curl','barbell-reverse-wrist-curl'];
const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe',probe=ff.replace('ffmpeg.exe','ffprobe.exe');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p)),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
fs.mkdirSync(base+'dependencies',{recursive:true});const dependencies=['node_modules/three/build/three.module.js','node_modules/three/build/three.core.js','node_modules/three/examples/jsm/environments/RoomEnvironment.js'].map(origin=>{const path=base+'dependencies/'+origin.split('/').pop();fs.copyFileSync(origin,path);return {path,origin,sha256:hash(path)};});
for(const id of ids){
 const poses=read(dir+id+'-poses.json'),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 const fixed=['root','upperarm01.L','lowerarm01.L','wrist.L','upperarm01.R','lowerarm01.R','wrist.R','foot.L','foot.R'];
 const fixedDrift=Math.max(...poses.flatMap(p=>fixed.map(n=>distance(p.joints[n],poses[0].joints[n]))));
 const gripBarAxisError=Math.max(...poses.flatMap(p=>p.joints.handles.map(h=>Math.hypot(h.axis[1],h.axis[2]))));
 const gripCenterLineError=Math.max(...poses.flatMap(p=>p.joints.handles.map(h=>Math.hypot(h.position[1]-p.joints.bar[1],h.position[2]-p.joints.bar[2]))));
 const loop=Math.max(distance(poses[0].joints.bar,poses[480].joints.bar),...fixed.map(n=>distance(poses[0].joints[n],poses[480].joints[n])));
 const palmYs=poses.flatMap(p=>p.joints.palmNormals.map(n=>n[1]));const palmYRange=[Math.min(...palmYs),Math.max(...palmYs)];
 const barRise=Math.max(...poses.map(p=>p.joints.bar[1]))-Math.min(...poses.map(p=>p.joints.bar[1]));
 if(fixedDrift>1e-8||loop>1e-8||gripBarAxisError>1e-8||gripCenterLineError>1e-8||barRise<.8)throw Error('Kinematic failure '+id);
 const geometry=read(dir+id+'-geometry.json');if(geometry.forearmThighMinSampledGap<0||geometry.forearmThighMinSampledGap>.03)throw Error('Support gap '+id);
 const themes=[];
 for(const suffix of ['', '-dark']){
  const file=dir+id+suffix+'.mp4';cp.execFileSync(ff,['-v','error','-i',file,'-f','null','-'],{windowsHide:true});
  const meta=JSON.parse(cp.execFileSync(probe,['-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,r_frame_rate,nb_read_frames,duration','-of','json',file],{windowsHide:true})).streams[0];
  if(meta.width!==480||meta.height!==480||meta.r_frame_rate!=='24/1'||Number(meta.nb_read_frames)!==192||Number(meta.duration)!==8)throw Error('Format mismatch');
  cp.execFileSync(ff,['-v','error','-i',file,'-vf','fps=4,scale=240:240,tile=8x4','-frames:v','1','-y',dir+id+'-contact'+suffix+'.jpg'],{windowsHide:true});
  themes.push({suffix,file,sha256:hash(file),frames:192,width:480,height:480,fps:24,seconds:8,bytes:fs.statSync(file).size,decode:'passed'});
 }
 cp.execFileSync(ff,['-v','error','-i',themes[0].file,'-vf','fps=2,scale=480:480,tile=4x4','-frames:v','1','-y',dir+id+'.jpg'],{windowsHide:true});
 const sources=[id==='barbell-wrist-curl'?'https://www.muscleandstrength.com/exercises/barbell-wrist-curl.html':'https://www.muscleandstrength.com/exercises/reverse-barbell-wrist-curl.html'];
 const kin={samples:481,fixedDrift,gripBarAxisError,gripCenterLineError,loopDrift:loop,palmYRange,barRise,...geometry};
 const prov={id,renderer:'skinned-pilot-v1',render:{width:480,height:480,fps:24,frames:192,seconds:8,light:'#fafafa',dark:'#09090b',phase:'renderSkinned(outputFrame * 2.5)',interpolation:'none'},inputs:['human.json','motion.mjs','studio.mjs','render.mjs'].map(file=>({path:base+file,sha256:hash(base+file)})),dependencies,sourceUrls:sources,sourceSummary:id==='barbell-wrist-curl'?'M&S seated barbell wrist curl: forearms on thighs, palms up, wrist-only curling and controlled lowering. Tip explicitly retains closed fingers at bottom.':'M&S reverse grip barbell wrist curl: seated forearms on thighs, palms down, shoulder-width overhand grip, wrists beyond knees, controlled raise and lower.',motion:'One shared rigid straight bar. '+(id==='barbell-wrist-curl'?'Supinated grip: 30 degree extension to 25 degree flexion.':'Pronated grip: 30 degree flexion to 25 degree extension.'),kinematics:kin,sourceKind:'Diagnostic encoded-video contact sheet; true inputs are continuous rig and procedural motion.'};
 write(dir+id+'-provenance.json',prov);write(dir+id+'-technical.json',{id,themes,kinematics:kin,sources,sourceSha256:hash(dir+id+'.jpg'),rigSourceSha256:hash(dir+id+'-provenance.json')});console.log(JSON.stringify({id,...kin}));
}
