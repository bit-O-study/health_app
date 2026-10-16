const fs=require('fs'),crypto=require('crypto');const root='tools/media/motion-guides';const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const reviews=read(root+'/reviews.json'),records=read(root+'/verification.json');const ids=read('tools/media/motion-refresh/all-exercises-progress.json').entries.filter(x=>x.status==='reviewed-both-themes').map(x=>x.id);const errors=[];let checked=0;
for(const id of ids){const spec=read(root+'/'+id+'.json');if(!spec.rigSource?.endsWith('.json'))continue;const p=root+'/'+spec.rigSource,prov=read(p),review=reviews.find(x=>x.id===id),record=records.find(x=>x.id===id);checked++;
if(sha(p)!==review?.rigSourceSha256||sha(p)!==record?.rigSourceSha256)errors.push({id,error:'rig SHA'});
if(JSON.stringify(spec.sources)!==JSON.stringify(review?.sources))errors.push({id,error:'spec/review URLs'});
if(prov.sourceUrls&&JSON.stringify(spec.sources)!==JSON.stringify(prov.sourceUrls))errors.push({id,error:'provenance URLs',spec:spec.sources,provenance:prov.sourceUrls});
}
console.log(JSON.stringify({checked,errors},null,2));if(errors.length)process.exitCode=1;
