const fs=require('node:fs'),vm=require('node:vm'),base='tools/media/imports/hundred-20261111';
let s=fs.readFileSync(base+'/check-resistance.cjs','utf8').replace('resistance-ids.json','cable-accessories-ids.json').replace("id.startsWith('single-arm')","id.endsWith('external-rotation')");
vm.runInNewContext(s,{require,console});
