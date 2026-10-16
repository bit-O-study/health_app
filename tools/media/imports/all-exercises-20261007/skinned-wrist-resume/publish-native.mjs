import {readFileSync,writeFileSync,copyFileSync,existsSync,mkdirSync,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {manageMotionGuides} from '../../../manage-motion-guides.mjs';
const own='tools/media/imports/all-exercises-20261007/skinned-wrist-resume';
const base=own+'/native',root='tools/media/motion-guides',pub='public/exercise-guides/ai-v3',id='reverse-wrist-curl';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const jsonHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const expected=read(own+'/expected-existing.json'),review=read(`${base}/${id}-review.json`),provenance=read(`${base}/${id}-provenance.json`);
const backup=own+'/backup-before-continuous-3d';
if(existsSync(backup))throw Error('Backup already exists; stop to preserve previous adoption evidence');
if(review.status!=='passed-isolated-candidate'||review.equipmentIds.length!==1||review.equipmentIds[0]!=='dumbbell')throw Error('Review or equipment mismatch');
if(review.playback.results.length!==2||!review.playback.results.every(x=>x.play&&x.seek&&x.loop&&x.width===480&&x.height===480&&x.duration===8))throw Error('Incomplete playback');
if(sha(`${base}/${id}.jpg`)!==review.sourceSha256||sha(`${base}/${id}-provenance.json`)!==review.rigSourceSha256)throw Error('Source changed');
for(const item of [...provenance.inputs,...provenance.dependencies])if(sha(item.path)!==item.sha256)throw Error('Source chain changed: '+item.path);
if(JSON.stringify(review.sources)!==JSON.stringify(provenance.sourceUrls)||review.sources.some(url=>!url.startsWith('https://')))throw Error('Source mismatch');
if(review.themes.length!==2)throw Error('Expected both themes');
for(const [i,suffix] of ['', '-dark'].entries()){
 const theme=review.themes[i],file=`${base}/${id}${suffix}.mp4`;
 if(theme.suffix!==suffix||theme.file!==file||sha(file)!==theme.sha256||theme.decode!=='passed'||theme.width!==480||theme.height!==480||theme.fps!==24||theme.frames!==192||theme.seconds!==8||readFileSync(file).length!==theme.bytes)throw Error('Invalid video '+suffix);
}
if(review.themes[0].sha256!==review.videoSha256||review.themes[1].sha256!==review.darkVideoSha256)throw Error('Theme hash mismatch');
for(const name of ['exercise','equipment','setup','hands','feet','movement'])if(!review.checks[name]?.trim())throw Error('Missing check '+name);
for(const item of expected.files)if((existsSync(item.path)?sha(item.path):null)!==item.sha256)throw Error('Existing asset changed: '+item.path);
for(const kind of ['reviews','verification'])if(jsonHash(read(`${root}/${kind}.json`).filter(x=>x.id===id))!==expected.records[kind])throw Error('Existing '+kind+' record changed');
console.log('All candidate/source-chain/existing-asset guards passed');
if(!process.argv.includes('--publish')){console.log('Check only. Invoke with --publish to adopt root-reviewed candidate.');process.exit(0);}
// Exclusive directory and COPYFILE_EXCL ensure no backup is ever overwritten.
mkdirSync(backup);
const saved=[];
for(const item of expected.files){if(item.sha256===null)continue;const target=backup+'/'+item.backup;copyFileSync(item.path,target,constants.COPYFILE_EXCL);if(sha(target)!==item.sha256)throw Error('Backup hash mismatch');saved.push({...item,target});}
for(const kind of ['reviews','verification'])write(`${backup}/previous-${kind}.json`,read(`${root}/${kind}.json`).filter(x=>x.id===id));
write(backup+'/backup-manifest.json',{id,files:saved,records:expected.records});
const rigSource=id+'-provenance.json';
copyFileSync(`${base}/${id}.jpg`,`${root}/${id}.jpg`);copyFileSync(`${base}/${id}-provenance.json`,`${root}/${rigSource}`);
write(`${root}/${id}.json`,{id,equipment:'dumbbell',panels:16,renderer:'skinned-pilot-v1',rigSource,cutout:true,sources:review.sources,sourceKind:'Diagnostic contact sheet; procedural model and motion inputs tracked by provenance',registeredAt:new Date().toISOString()});
for(const suffix of ['', '-dark'])copyFileSync(`${base}/${id}${suffix}.mp4`,`${pub}/${id}${suffix}.mp4`);
const entry={id,renderVersion:'skinned-pilot-v1',panels:16,cutout:true,sourceSha256:review.sourceSha256,rigSourceSha256:review.rigSourceSha256,videoSha256:review.videoSha256,darkVideoSha256:review.darkVideoSha256,width:480,height:480,fps:24,seconds:8,bytes:review.themes[0].bytes,darkBytes:review.themes[1].bytes,decode:'passed',verifiedAt:new Date().toISOString()};
write(`${root}/verification.json`,[...read(`${root}/verification.json`).filter(x=>x.id!==id),entry]);
await manageMotionGuides('motion-review',id,encodeURIComponent(JSON.stringify({status:'passed',checks:review.checks,note:'Root inspected final light/dark 32-frame sheets, hand-0/210 closeups and side-210. Approved seated thigh-supported pronated wrist extension: rigid attached dumbbells, fixed forearms and feet, clean loop without cutout damage or interpolation ghosts. Minor angular elbow skin recorded. 481-sample kinematics, decoded videos and mobile Edge play/seek/loop verified; exact source-chain hashes checked before adoption. '+review.limitations.replace('Agent isolated visual review only; root approval required. ', '')})));
write(`${base}/${id}-published.json`,entry);
console.log('Adopted '+id+' with preserved backups at '+backup);

