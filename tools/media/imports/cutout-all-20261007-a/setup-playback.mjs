import {readFileSync,writeFileSync} from 'node:fs';
const a='tools/media/imports/cutout-all-20261007-a/';writeFileSync(a+'verify-u2net-playback.mjs',readFileSync(a+'verify-playback.mjs','utf8').replace("['','-refined']","['-u2net']"));
