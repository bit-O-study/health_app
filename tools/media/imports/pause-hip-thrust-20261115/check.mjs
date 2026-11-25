import {readFileSync,writeFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
const dir='tools/media/imports/pause-hip-thrust-20261115/native/pause-hip-thrust';
const report={status:'numeric-checks-passed',...checkPoses('pause-hip-thrust',JSON.parse(readFileSync(dir+'/poses.json')))};
writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2));console.log(report);
