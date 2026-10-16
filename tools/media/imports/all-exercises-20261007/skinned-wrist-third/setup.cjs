// Final files are authoritative, no regeneration from earlier exercises.
const fs=require('fs');for(const name of ['human.json','motion.mjs','studio.mjs','render.mjs'])if(!fs.existsSync('tools/media/imports/all-exercises-20261007/skinned-wrist-third/'+name))throw Error('Missing '+name);console.log('Final inputs present');
