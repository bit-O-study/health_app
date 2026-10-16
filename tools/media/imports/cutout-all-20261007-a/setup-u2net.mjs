import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const a='tools/media/imports/cutout-all-20261007-a/',b='tools/media/imports/cutout-all-20261007-b/';
for(const f of ['u2net-endpoints.py','u2net-endpoints.mjs','render-u2net.mjs'])writeFileSync(a+f,readFileSync(b+f,'utf8').replaceAll('cutout-all-20261007-b','cutout-all-20261007-a').replaceAll("['ab-rollout','chest-dip','lying-triceps-extension']","['ez-bar-skull-crusher']"));
copyFileSync(b+'monitor_memory.py',a+'monitor_memory.py');
