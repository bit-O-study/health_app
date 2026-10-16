// Production inputs are fixed. Do not overwrite them by rerunning a bootstrap.
const fs=require('fs');for(const f of ['human.json','motion.mjs','studio.mjs'])if(!fs.existsSync(__dirname+'/'+f))throw Error('Missing '+f);console.log('Existing production inputs preserved.');
