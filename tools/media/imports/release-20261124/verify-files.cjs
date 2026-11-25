const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=process.cwd().replaceAll('\\','/');
const git=(...args)=>cp.execFileSync('git',['-c',`safe.directory=${root}`,...args],{encoding:'utf8',maxBuffer:32*1024*1024});
const files=[...new Set([...git('diff','--name-only','HEAD').trim().split('\n'),...git('ls-files','--others','--exclude-standard').trim().split('\n')])].filter(p=>/^public\/exercise-guides\/ai-v3\/.*\.(mp4|webm)$/.test(p));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const reports=[];const ff='C:/git/Bit-O/video-tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
for(const file of files){
 const id=path.basename(file).replace(/(?:-alpha\.webm|-dark\.mp4|\.mp4)$/,'');
 const provenance=read(`tools/media/motion-guides/${id}-provenance.json`);
 assert.equal(provenance.status,'passed-isolated-candidate',id);
 const candidate=read(path.join(path.dirname(provenance.sourceContact.path),'candidate.json'));
 const output=candidate.outputs.find(x=>path.basename(x.file)===path.basename(file));
 assert.ok(output,file);assert.equal(sha(file),output.sha256,file);
 if(output.decode!=='passed'){
  const record=read(path.join(path.dirname(provenance.sourceContact.path),'../../published-verification.json'));
  assert.equal(record.report.find(x=>x.id===id)?.fullDecode,'passed',file);
 }
 for(const input of provenance.inputs)assert.equal(sha(input.path),input.sha256,input.path);
 reports.push({file,sha256:output.sha256,decode:'pending'});
}
const dest='tools/media/imports/release-20261124/files.json';
if(process.argv.includes('--hash-only')){
 fs.writeFileSync(dest,JSON.stringify({checkedAt:new Date().toISOString(),verification:'Fresh output/input hashes match previously decoded and reviewed artifacts; full re-decode was interrupted.',files:reports.map(x=>({...x,decode:'previous-record-passed'}))},null,2)+'\n');
 console.log(JSON.stringify({files:reports.length,allHashes:true,allInputs:true,previousDecodeRecords:'passed',freshDecode:'not-completed'}));
 return;
}
async function worker(){for(;;){const entry=reports.find(x=>x.decode==='pending');if(!entry)return;entry.decode='running';await new Promise((resolve,reject)=>{const child=cp.spawn(ff,['-v','error','-threads','2','-i',entry.file,'-f','null','-'],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>error+=d);child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(entry.file+': '+error)));});entry.decode='passed';}}
Promise.all([worker(),worker()]).then(()=>{fs.writeFileSync(dest,JSON.stringify({checkedAt:new Date().toISOString(),files:reports},null,2)+'\n');console.log(JSON.stringify({files:reports.length,allHashes:true,allInputs:true,allDecoded:true}));}).catch(e=>{console.error(e);process.exitCode=1;});
