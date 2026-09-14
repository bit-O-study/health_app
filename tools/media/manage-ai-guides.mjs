import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { selectReviewedGuides, REVIEW_CHECKS } from './guide-review.mjs';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute, extname } from 'node:path';
const root=resolve('tools/media/ai-guides');
const catalog=JSON.parse(readFileSync(resolve(root,'catalog.json'),'utf8'));
const promptsPath=resolve(root,'prompts.json');
const prompts=JSON.parse(readFileSync(promptsPath,'utf8'));
const [command, id, imagePath, promptPath]=process.argv.slice(2);
const reviewsPath=resolve(root,'reviews.json');
const reviews=JSON.parse(readFileSync(reviewsPath,'utf8'));
const sheetPath=exerciseId=>resolve(root,exerciseId+(existsSync(resolve(root,exerciseId+'.jpg'))?'.jpg':'.png'));
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
function publishReviewed() {
 const artifacts=prompts.filter(x=>existsSync(resolve('public/exercise-guides/ai-v2',x.id+'.mp4'))).map(x=>({
  id:x.id,sourceSha256:sha(sheetPath(x.id)),videoSha256:sha(resolve('public/exercise-guides/ai-v2',x.id+'.mp4'))
 }));
 const linked=selectReviewedGuides(reviews,artifacts);
 writeFileSync(resolve('public/exercise-guides/ai-v2/manifest.json'),JSON.stringify(linked,null,2)+'\n');
 return linked;
}
if(command?.startsWith('motion-')) {
 const {manageMotionGuides}=await import('./manage-motion-guides.mjs');
 await manageMotionGuides(command,id,imagePath,promptPath);
} else if(command==='list') {
 const done=new Set(prompts.map(x=>x.id));
 const missing=catalog.filter(x=>!done.has(x.id));
 console.log(JSON.stringify({total:catalog.length,registered:done.size,missing:missing.slice(0,Number(id)||20)},null,2));
} else if(command==='register') {
 if(!catalog.some(x=>x.id===id)||!/^[a-z0-9-]+$/.test(id))throw Error('Unknown exercise');
 const generatedRoot=resolve(process.env.USERPROFILE,'.codex/generated_images');
 const image=resolve(imagePath);const rel=relative(generatedRoot,image);
 if(rel.startsWith('..')||isAbsolute(rel)||extname(image)!=='.png')throw Error('Source must be a generated PNG');
 const prompt=promptPath;
 if(!prompt||prompt.length>16000)throw Error('Expected generation prompt');
 await sharp(image).jpeg({ quality: 80 }).toFile(resolve(root,`${id}.jpg`));
 const entry={id,prompt};const index=prompts.findIndex(x=>x.id===id);
 if(index>=0)prompts[index]=entry;else prompts.push(entry);
 writeFileSync(promptsPath,JSON.stringify(prompts,null,2)+'\n');
 console.log(`${id}: registered`);
} else if(command==='inspect') {
 if(!catalog.some(x=>x.id===id))throw Error('Unknown exercise');
 const data=await sharp(sheetPath(id)).resize({width:1536,withoutEnlargement:true}).jpeg({quality:65}).toBuffer();
 console.log('data:image/jpeg;base64,'+data.toString('base64'));
} else if(command==='review') {
 if(!prompts.some(x=>x.id===id))throw Error('Exercise has no registered image');
 const entry=JSON.parse(decodeURIComponent(imagePath));
 const allowed=catalog.find(x=>x.id===id).equipments.map(x=>typeof x==='string'?x:x.equipment);
 if(entry.status==='passed'&&(!Array.isArray(entry.equipmentIds)||!entry.equipmentIds.length||!entry.equipmentIds.every(x=>allowed.includes(x))))throw Error('Review must name matching catalog equipment');
 if(!['passed','rejected','pending'].includes(entry.status))throw Error('Invalid review status');
 if(entry.status==='passed'&&(!Array.isArray(entry.sources)||!entry.sources.length||!REVIEW_CHECKS.every(k=>typeof entry.checks?.[k]==='string'&&entry.checks[k].trim())))throw Error('Record sources and every content check');
 const video=resolve('public/exercise-guides/ai-v2',id+'.mp4');
 const review={...entry,id,sourceSha256:sha(sheetPath(id)),videoSha256:existsSync(video)?sha(video):null,reviewedAt:new Date().toISOString()};
 const i=reviews.findIndex(x=>x.id===id);if(i>=0)reviews[i]=review;else reviews.push(review);
 writeFileSync(reviewsPath,JSON.stringify(reviews,null,2)+'\n');
 console.log(id+': '+entry.status+'; '+publishReviewed().length+' reviewed videos linked');
} else if(command==='publish-reviewed') {
 console.log(publishReviewed().length+' reviewed videos linked');
} else if(command==='check-mobile') {
 execFileSync(process.execPath,['node_modules/@playwright/test/cli.js','test','tests/e2e/demo-video-fits-phone.spec.ts','--project=mobile-chromium'],{stdio:'inherit',env:{...process.env,E2E_BASE_URL:'http://localhost:3110'}});
 } else if(command==='build-motion-preview') {
 const {buildDeadliftMotionPreview}=await import('./build-deadlift-motion-preview.mjs');
 await buildDeadliftMotionPreview(id,imagePath);
} else if(command==='inspect-motion-preview') {
 const data=await sharp(resolve(root,'deadlift-motion-preview/contact-sheet.jpg')).jpeg({quality:80}).toBuffer();
 console.log('data:image/jpeg;base64,'+data.toString('base64'));
} else if(command==='build') {
 await import('./build-ai-exercise-guides.mjs');
} else if(command==='coverage') {
 const rendered=catalog.filter(x=>existsSync(resolve('public/exercise-guides/ai-v2',`${x.id}.mp4`))).map(x=>x.id);
 writeFileSync(resolve(root,'coverage.json'),JSON.stringify({total:catalog.length,rendered,missing:catalog.filter(x=>!rendered.includes(x.id)).map(x=>x.id)},null,2)+'\n');
 console.log(`${rendered.length}/${catalog.length} rendered; ${JSON.parse(readFileSync(resolve('public/exercise-guides/ai-v2/manifest.json'),'utf8')).length} reviewed and linked`);
} else throw Error('Expected list, register, inspect, review, publish-reviewed, build, or coverage');
