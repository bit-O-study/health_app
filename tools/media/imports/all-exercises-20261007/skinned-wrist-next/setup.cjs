// Final inputs are authoritative; no regeneration from a previous candidate.
const fs=require('fs');for(const name of ['human.json','motion.mjs','studio.mjs','render.mjs'])if(!fs.existsSync('tools/media/imports/all-exercises-20261007/skinned-wrist-next/'+name))throw Error('Missing '+name);console.log('Candidate inputs present');
