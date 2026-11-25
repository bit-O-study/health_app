import {writeFileSync} from 'node:fs';
const result={checkedAt:new Date().toISOString()};
for(const f of ['manifest.json','manifest-dark.json']){const r=await fetch('https://health.helthssu.co.kr/exercise-guides/ai-v3/'+f,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(r.status);const j=await r.json();result[f]={count:j.length,includesNew:j.includes('tempo-row')};}
writeFileSync('tools/media/imports/tempo-row-20261115/live-coverage.json',JSON.stringify(result,null,2));console.log(result);
