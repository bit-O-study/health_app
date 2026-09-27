import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

test('8-pose rebuild never interpolates leftover frames from a 16-pose render', async () => {
 const fixtureRoot=resolve('tools/media/motion-guides');
 const fixture=mkdtempSync(join(fixtureRoot,'render-test-'));
 const moduleUrl=pathToFileURL(resolve('tools/media/manage-motion-guides.mjs')).href;
 const binDir=join(process.env.LOCALAPPDATA??'','Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
 const ffmpeg=existsSync(join(binDir,'ffmpeg.exe'))?join(binDir,'ffmpeg.exe'):'ffmpeg';
 try {
  const guides=join(fixture,'tools/media/motion-guides');
  const frames=join(guides,'fixture','frames-light');
  mkdirSync(frames,{recursive:true});
  mkdirSync(join(fixture,'tools/media/ai-guides'),{recursive:true});
  writeFileSync(join(fixture,'tools/media/ai-guides/catalog.json'),JSON.stringify([{id:'fixture',equipments:['bodyweight']}]));
  // 단색 픽스처는 누끼할 대상이 없으므로 예전(회색 여백) 경로로 보간 로직만 검증한다
  writeFileSync(join(guides,'fixture.json'),JSON.stringify({panels:8,cycle:'reverse',equipment:'bodyweight',cutout:false}));
  await sharp({create:{width:80,height:40,channels:3,background:'#ff0000'}}).jpeg().toFile(join(guides,'fixture.jpg'));
  const stale=await sharp({create:{width:480,height:480,channels:3,background:'#0000ff'}}).jpeg().toBuffer();
  for(let i=21;i<=40;i++)writeFileSync(join(frames,String(i).padStart(3,'0')+'.jpg'),stale);
  execFileSync(process.execPath,['--input-type=module','-e',
   'const {manageMotionGuides}=await import('+JSON.stringify(moduleUrl)+'); await manageMotionGuides("motion-build","fixture");'],
   {cwd:fixture,stdio:'pipe'});
  const lastPixel=execFileSync(ffmpeg,['-v','error','-i',join(fixture,'public/exercise-guides/ai-v3/fixture.mp4'),
   '-vf','select=eq(n\\,191),scale=1:1','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
  assert.equal(lastPixel.length,3,'the 192nd frame must exist');
  assert.ok(lastPixel[0]>200&&lastPixel[2]<30,'last frame must remain red, got '+[...lastPixel]);
  assert.ok(!existsSync(join(fixture,'public/exercise-guides/ai-v3/fixture-dark.mp4')),'non-cutout guides have no dark variant');
 } finally {
  assert.equal(dirname(resolve(fixture)),fixtureRoot);
  rmSync(fixture,{recursive:true,force:true});
 }
});


test('16-pose full cycle plays forward twice instead of rewinding', async () => {
 const fixtureRoot=resolve('tools/media/motion-guides');
 const fixture=mkdtempSync(join(fixtureRoot,'render-test-'));
 const moduleUrl=pathToFileURL(resolve('tools/media/manage-motion-guides.mjs')).href;
 const binDir=join(process.env.LOCALAPPDATA??'','Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin');
 const ffmpeg=existsSync(join(binDir,'ffmpeg.exe'))?join(binDir,'ffmpeg.exe'):'ffmpeg';
 // 밝기를 16칸에 걸쳐 단조 증가시켜 두면, 출력 프레임의 밝기로 어떤 자세가 재생 중인지 읽을 수 있다.
 const gray=i=>16+i*14;
 const sample=(file,seconds)=>execFileSync(ffmpeg,['-v','error','-ss',String(seconds),'-i',file,
  '-vf','scale=1:1','-frames:v','1','-f','rawvideo','-pix_fmt','gray','pipe:1'])[0];
 try {
  const guides=join(fixture,'tools/media/motion-guides');
  mkdirSync(guides,{recursive:true});
  mkdirSync(join(fixture,'tools/media/ai-guides'),{recursive:true});
  writeFileSync(join(fixture,'tools/media/ai-guides/catalog.json'),JSON.stringify([{id:'fixture',equipments:['bodyweight']}]));
  writeFileSync(join(guides,'fixture.json'),JSON.stringify({panels:16,cycle:'full',equipment:'bodyweight',cutout:false}));
  await sharp({create:{width:480,height:480,channels:3,background:'#000000'}})
   .composite(Array.from({length:16},(_,i)=>({
    input:{create:{width:120,height:120,channels:3,background:{r:gray(i),g:gray(i),b:gray(i)}}},
    left:(i%4)*120,top:Math.floor(i/4)*120})))
   .jpeg().toFile(join(guides,'fixture.jpg'));
  execFileSync(process.execPath,['--input-type=module','-e',
   'const {manageMotionGuides}=await import('+JSON.stringify(moduleUrl)+'); await manageMotionGuides("motion-build","fixture");'],
   {cwd:fixture,stdio:'pipe'});
  const movie=join(fixture,'public/exercise-guides/ai-v3/fixture.mp4');
  // 후반부(두 번째 주기)에서도 밝기가 계속 올라가야 full. reverse 라면 같은 구간에서 내려간다.
  const early=sample(movie,5.0), late=sample(movie,6.5);
  assert.ok(late>early+20,'full cycle must keep advancing in the second half, got '+early+' then '+late);
  // 앞 주기도 상승하는지 확인해 두 주기 모두 정방향임을 못 박는다.
  assert.ok(sample(movie,3.0)>sample(movie,1.0)+20,'first half must advance too');
 } finally {
  assert.equal(dirname(resolve(fixture)),fixtureRoot);
  rmSync(fixture,{recursive:true,force:true});
 }
});
