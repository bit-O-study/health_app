import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
const dir='tools/media/imports/hip-adduction-candidates-20260918';
mkdirSync(dir,{recursive:true});
const generated='C:/Users/admin/.codex/generated_images/01a0b202-9954-76a2-b980-26c777b1c560/';
const candidates=[{"name":"fixed-handles","file":"exec-06b83d18-7909-4956-a024-a245e2d97361.png","prompt":"Use case: scientific-educational. Create a new 4 columns by 4 rows animation pose sheet: EXACTLY 16 equal SQUARE cells in a square canvas. Gray muscular adult male mannequin, teal shorts, gray trainers, seated HIP ADDUCTION machine, front view. Opaque uniform light gray studio background. Entire person and machine fit inside every cell with generous margins. Fixed orthographic camera, identical scale. Machine has a rigid black seat and backrest on a fixed rectangular steel base. TWO FIXED SIDE HANDLES attached to seat at hip level, never attached to moving leg levers. Hands firmly grasp these handles beside hips in identical positions in every cell. Head, torso, pelvis, hands, arms, seat, backrest and base DO NOT MOVE. Only thighs rotate inward at hips: two black pads rest against INNER thighs just above knees and two foot platforms move with the paired hinged leg levers. Show ONLY closing half of one repetition, read left-to-right then next row: knee separation gradually decreases from wide to nearly together in sixteen small evenly spaced steps. Row1 wide to moderately wide, row2 moderately wide to medium, row3 medium to narrow, row4 narrow to nearly together. Both knees stay bent about90 degrees, shoes remain planted on moving foot platforms. Rigid mechanical linkage below seat, footrests mounted on levers, base feet never move. Clear visible gap between FIXED HANDLES and MOVING KNEE PADS in all cells. Crisp clean 3D educational render, no blurred limbs, no double outlines, no text or labels or grid lines, no inconsistent camera or body size."},{"name":"central-pedestal","file":"exec-3d826eb1-25ad-4fa2-b88d-033d46fac58c.png","prompt":"Use case scientific-educational. New original 3D sprite sheet, EXACT 4 columns x4 rows, sixteen equal square cells on square canvas. Gray muscular mannequin teal shorts gray trainers seated HIP ADDUCTION, frontal orthographic camera. Solid light gray background. One continuous sequence of 16 evenly spaced closing leg poses from wide knees to knees nearly together. Rigid upright torso, head, arms, hands, seat and backrest IDENTICAL coordinates and scale across all cells. MACHINE DESIGN: seat fixed atop SINGLE CENTRAL VERTICAL STEEL PEDESTAL on a SMALL CIRCULAR FLOOR BASE, identical in all16 frames. No wide floor chassis. Two black side hand grips on identical rigid L-brackets attached to seat, hands grip them motionlessly beside hips. Leg levers hinged directly under seat independently of the floor base, each with black pad against INNER thigh and floating cantilever foot platform. Knees bend90degrees; pads and foot platforms move INWARD WITH LEGS. Feet never touch the floor base. Only thighs, pads, shins, shoes and foot platforms change positions. Floor base remains centered directly beneath seat, narrow diameter, constant size. Closing trajectory progresses continuously through all16 cells; no row resets, no body resizing. End nearly together. Clear separation of fixed handgrips from moving knee pads. Entire apparatus and person fit in central85% of every cell. Clean crisp gray 3D educational character with teal shorts, no photo realism, no ghost limbs, no labels, no numbers, no borders."}];
for(const c of candidates){copyFileSync(generated+c.file,dir+'/'+c.name+'.png');await sharp(generated+c.file).removeAlpha().jpeg({quality:92}).toFile(dir+'/'+c.name+'.jpg');}
writeFileSync(dir+'/prompts.json',JSON.stringify(candidates,null,2));
const ids=['landmine-row','low-bar-squat'];
const evidence=[];
const ffmpeg=join(process.env.LOCALAPPDATA,'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe');
for(const id of ids)for(const suffix of ['','-dark']){
const path='public/exercise-guides/ai-v3/'+id+suffix+'.mp4';
const data=readFileSync(path);
copyFileSync(path,dir+'/'+id+suffix+'.mp4');
execFileSync(ffmpeg,['-v','error','-i',dir+'/'+id+suffix+'.mp4','-f','null','-'],{stdio:'pipe'});
evidence.push({id,suffix,sha256:createHash('sha256').update(data).digest('hex'),decode:'passed'});
}
writeFileSync(dir+'/decode.json',JSON.stringify(evidence,null,2));
const template=readFileSync('tools/media/imports/verify-batch-playback-20260917.mjs','utf8').replace("['dumbbell-shrug','dumbbell-front-raise']","['landmine-row','low-bar-squat']").replace('playback-20260917.json','playback-row-squat-20260918.json');
writeFileSync('tools/media/imports/verify-row-squat-20260918.mjs',template);
console.log('data:image/jpeg;base64,'+(await sharp(dir+'/central-pedestal.jpg').resize({width:1600}).toBuffer()).toString('base64'));

