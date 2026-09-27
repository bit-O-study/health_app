import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const project = resolve('.');
const preview = join(project, 'tools/media/imports/low-bar-u2netp-20260918');
const guides = join(preview, 'tools/media/motion-guides');
mkdirSync(guides, { recursive: true });
mkdirSync(join(preview, 'tools/media/ai-guides'), { recursive: true });
process.env.MOTION_CUTOUT_MODEL = 'u2netp';
process.env.U2NET_HOME = join(project, 'tools/media/imports/cutout-models');
process.env.OMP_NUM_THREADS = '2';
const action = process.argv[2] ?? 'build';
if (action === 'build') {
  const catalog = JSON.parse(readFileSync('tools/media/ai-guides/catalog.json'));
  writeFileSync(join(preview, 'tools/media/ai-guides/catalog.json'), JSON.stringify(catalog.filter(x => x.id === 'low-bar-squat')));
  for (const ext of ['jpg', 'json']) copyFileSync('tools/media/motion-guides/low-bar-squat.' + ext, join(guides, 'low-bar-squat.' + ext));
  writeFileSync(join(preview, 'preview-model.json'), JSON.stringify({ model: 'u2netp', scope: 'Isolated comparison; not published to app', createdAt: new Date().toISOString() }, null, 2));
}
process.chdir(preview);
const { manageMotionGuides } = await import(pathToFileURL(join(project, 'tools/media/manage-motion-guides.mjs')));
if (action === 'build') await manageMotionGuides('motion-build', 'low-bar-squat');
else if (action === 'inspect') await manageMotionGuides('motion-inspect', 'low-bar-squat', process.argv[3]);
else throw Error('Expected build or inspect');
