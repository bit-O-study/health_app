// Validate final authoritative inputs, without regenerating from other exercises.
const fs=require('fs');for(const f of ['human.json','motion.mjs','studio.mjs','render.mjs'])if(!fs.existsSync('tools/media/imports/all-exercises-20261007/skinned-plate-curl-next/'+f))throw Error('Missing '+f);console.log('Final inputs present');
