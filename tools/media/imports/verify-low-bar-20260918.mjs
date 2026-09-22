import { readFileSync, writeFileSync } from 'node:fs';
const template = readFileSync('tools/media/imports/verify-batch-playback-20260917.mjs', 'utf8')
  .replace("['dumbbell-shrug','dumbbell-front-raise']", "['low-bar-squat']")
  .replace('playback-20260917.json', 'playback-low-bar-20260918.json');
const runner = 'tools/media/imports/verify-low-bar-runner-20260918.mjs';
writeFileSync(runner, template);
await import('./verify-low-bar-runner-20260918.mjs');
