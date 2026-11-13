const fs=require('node:fs'),base='tools/media/imports/hundred-20261111',p=base+'/cat-cow-motion.mjs',poses=JSON.parse(fs.readFileSync(base+'/native/fire-hydrant/poses.json')),j=poses[0].joints;
let s=fs.readFileSync(p,'utf8').replace('rad(76.9)','rad(76.9+7.2*(2*a-1))');
s=s.replace('target=handTargets[side].clone()',`target=v(side==='L'?${JSON.stringify(j['wrist.L'])}:${JSON.stringify(j['wrist.R'])})`);
fs.writeFileSync(p,s);
