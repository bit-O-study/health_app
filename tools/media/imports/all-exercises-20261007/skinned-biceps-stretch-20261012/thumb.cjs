const fs=require('fs'),p=__dirname+'/motion.mjs';let s=fs.readFileSync(p,'utf8').replace('f===1?-.3:0','f===1?.6:0');fs.writeFileSync(p,s);
