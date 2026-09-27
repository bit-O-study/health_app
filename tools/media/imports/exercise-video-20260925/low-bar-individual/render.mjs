import {mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
const project=resolve('.');
const out=resolve('tools/media/imports/exercise-video-20260925/low-bar-individual');
const generation=JSON.parse(readFileSync(join(out,'generation.json'),'utf8'));
const panels=[];
for(let i=0;i<generation.frames.length;i++){
const f=generation.frames[i];const dest=join(out,'pose-'+String(i+1).padStart(2,'0')+'.png');
copyFileSync(f.path,dest);
panels.push({input:await sharp(dest).removeAlpha().resize(512,512).png().toBuffer(),left:(i%4)*512,top:Math.floor(i/4)*512});
}
await sharp({create:{width:2048,height:2048,channels:3,background:'#b6b6b6'}}).composite(panels).png().toFile(join(out,'sheet.png'));
const guides=join(out,'tools/media/motion-guides');
mkdirSync(guides,{recursive:true});mkdirSync(join(out,'tools/media/ai-guides'),{recursive:true});mkdirSync(join(out,'public/exercise-guides/ai-v3'),{recursive:true});
const catalog=JSON.parse(readFileSync('tools/media/ai-guides/catalog.json','utf8'));
writeFileSync(join(out,'tools/media/ai-guides/catalog.json'),JSON.stringify(catalog.filter(x=>x.id==='low-bar-squat')));
await sharp(join(out,'sheet.png')).removeAlpha().jpeg({quality:96}).toFile(join(guides,'low-bar-squat.jpg'));
writeFileSync(join(guides,'low-bar-squat.json'),JSON.stringify({id:'low-bar-squat',prompt:generation.frames.map(f=>f.prompt).join('\n\n'),equipment:'barbell',sources:['https://www.muscleandstrength.com/exercises/low-bar-back-squat'],panels:16,cycle:'reverse',cutout:true}));
process.chdir(out);
const {manageMotionGuides}=await import(pathToFileURL(join(project,'tools/media/manage-motion-guides.mjs')));
await manageMotionGuides('motion-build','low-bar-squat');
