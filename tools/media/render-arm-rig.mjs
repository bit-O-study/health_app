import sharp from 'sharp';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const id = process.argv[2];
const rigs = JSON.parse(readFileSync('tools/media/motion-refresh/arm-rigs.json', 'utf8'));
if (!Object.hasOwn(rigs, id)) throw new Error('Unknown arm rig');
const rig = rigs[id];
const atlas = `tools/media/motion-refresh/${id}-atlas.png`;
const output = 'public/exercise-guides/refresh-candidates';
const parts = [];
for (const part of [rig.body, ...rig.limbs]) {
  const [left, top, width, height] = part.crop;
  parts.push((await sharp(atlas).extract({ left, top, width, height }).png().toBuffer()).toString('base64'));
}
const browser = await chromium.launch();
const themes = [];
try {
  const page = await browser.newPage();
  await page.setContent('<html></html>');
  await page.evaluate(async ({ parts, rig }) => {
    const images = await Promise.all(parts.map(async data => { const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode(); return img; }));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
    const ctx = canvas.getContext('2d');
    window.renderArmRig = (frame, dark) => {
      ctx.fillStyle = dark ? '#09090b' : '#fafafa'; ctx.fillRect(0, 0, 720, 720);
      const phase = (1 - Math.cos(2 * Math.PI * frame / 480)) / 2;
      const draw = (limb, index) => {
        const x = rig.body.at[0] + (limb.joint[0] - rig.body.crop[0]) * rig.body.scale;
        const y = rig.body.at[1] + (limb.joint[1] - rig.body.crop[1]) * rig.body.scale;
        const angle = limb.start + (limb.end - limb.start) * phase - limb.sourceAngle;
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle * Math.PI / 180); ctx.scale(limb.scale, limb.scale);
        ctx.drawImage(images[index + 1], limb.crop[0] - limb.pivot[0], limb.crop[1] - limb.pivot[1]); ctx.restore();
      };
      rig.limbs.forEach((limb, i) => { if (limb.behind) draw(limb, i); });
      ctx.drawImage(images[0], ...rig.body.at, rig.body.crop[2] * rig.body.scale, rig.body.crop[3] * rig.body.scale);
      rig.limbs.forEach((limb, i) => { if (!limb.behind) draw(limb, i); });
      return canvas.toDataURL().split(',')[1];
    };
  }, { parts, rig });
  for (const dark of [false, true]) {
    const suffix = dark ? '-dark' : '';
    if (process.argv.includes('--preview')) {
      for (const frame of [0, 120, 240]) writeFileSync(`${output}/${id}${suffix}-${frame}.png`, Buffer.from(await page.evaluate(([f, d]) => window.renderArmRig(f, d), [frame, dark]), 'base64'));
      continue;
    }
    const file = `${output}/${id}${suffix}.mp4`;
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'image2pipe', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'slow', '-crf', '18', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { windowsHide: true });
    const done = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`FFmpeg ${code}`))); });
    child.stderr.pipe(process.stderr);
    for (let frame = 0; frame < 480; frame++) {
      const data = Buffer.from(await page.evaluate(([f, d]) => window.renderArmRig(f, d), [frame, dark]), 'base64');
      if ([0, 120, 240].includes(frame)) writeFileSync(`${output}/${id}${suffix}-${frame}.png`, data);
      if (!child.stdin.write(data)) await new Promise(resolve => child.stdin.once('drain', resolve));
    }
    child.stdin.end(); await done;
    themes.push({ suffix, sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), bytes: readFileSync(file).length });
  }
} finally { await browser.close(); }
if (!process.argv.includes('--preview')) writeFileSync(`tools/media/motion-refresh/${id}-candidate.json`, JSON.stringify({ id, renderer: 'fixed-arm-rig-v1', timing: 'smooth', rigSource: `${id}-atlas.png`, sourceAtlasSha256: createHash('sha256').update(readFileSync(atlas)).digest('hex'), rig, status: 'pending-visual-review', themes }, null, 2) + '\n');
console.log(`${id}: ${themes.length ? 'rendered both themes' : 'previewed'}`);
