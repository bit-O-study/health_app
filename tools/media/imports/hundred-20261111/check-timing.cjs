const fs=require('fs'),assert=require('node:assert/strict');
const base='tools/media/imports/hundred-20261111';
const batch=JSON.parse(fs.readFileSync(base+'/batch.json','utf8'));
for(const e of batch.entries.filter(e=>e.recipe?.knots)){
 const poses=JSON.parse(fs.readFileSync(base+'/native/'+e.id+'/poses.json','utf8'));
 const knots=e.recipe.knots, y=f=>poses[f].joints.root[1];
 for(let i=1;i<knots.length;i++){
  const [a,from]=knots[i-1],[b,to]=knots[i],start=Math.round(a*480),end=Math.round(b*480);
  for(let f=start+1;f<=end;f++){
   if(from===to)assert.ok(Math.abs(y(f)-y(start))<1e-8,e.id+' hold');
   else assert.ok((y(f)-y(f-1))*(to-from)<=1e-8,e.id+' direction');
  }
 }
 const range=Math.max(...poses.map(p=>p.joints.root[1]))-Math.min(...poses.map(p=>p.joints.root[1]));
 if(e.recipe.family==='barbell-squat')assert.ok(Math.abs(range-(['partial-squat','bottom-half-squat'].includes(e.id)?2.35:4.7))<1e-8,e.id+' depth');
 console.log(e.id+': timing/holds/range passed');
}
