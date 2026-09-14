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
  const frames=join(guides,'fixture');
  mkdirSync(frames,{recursive:true});
  mkdirSync(join(fixture,'tools/media/ai-guides'),{recursive:true});
  writeFileSync(join(fixture,'tools/media/ai-guides/catalog.json'),JSON.stringify([{id:'fixture',equipments:['bodyweight']}]));
  writeFileSync(join(guides,'fixture.json'),JSON.stringify({panels:8,cycle:'reverse',equipment:'bodyweight'}));
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
 } finally {
  assert.equal(dirname(resolve(fixture)),fixtureRoot);
  rmSync(fixture,{recursive:true,force:true});
 }
});

