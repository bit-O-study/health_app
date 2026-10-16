import {freemem} from 'node:os';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';
if(freemem()<3*1024**3)throw Error('u2net requires at least3GiB free before inference');
const id=process.argv[2];if(!['reverse-wrist-curl'].includes(id))throw Error('Unknown id');
execFileSync('C:/git/Bit-O/video-tools/python312/python.exe',['tools/media/imports/all-exercises-20261007/wrist-cutout/u2net-endpoints.py',id,...(process.argv[3]==='full'?['full']:[])],{stdio:'inherit',timeout:90000,env:{...process.env,MOTION_CUTOUT_MODEL:'u2net',U2NET_HOME:resolve('tools/media/imports/cutout-models'),OMP_NUM_THREADS:'2',PYTHONIOENCODING:'utf-8'}});
