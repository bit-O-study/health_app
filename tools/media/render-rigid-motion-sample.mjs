import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A constrained 2D preview: fixed torso and rigid arms, without optical flow.
// One existing pose supplies the appearance; this is not a full anatomical rig.
const root = fileURLToPath(new URL('../../', import.meta.url));
mkdirSync(`${root}/scripts`, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3189/exercise-guides/smooth-sample/');
  await page.waitForFunction(() => document.querySelector('#before').readyState >= 2);
  await page.evaluate(async () => {
    const video = document.querySelector('#before');
    video.currentTime = 3.4;
    await new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
    const source = document.createElement('canvas');
    source.width = source.height = 480;
    const ctx = source.getContext('2d');
    ctx.drawImage(video, 0, 0, 480, 480);
    const pixels = ctx.getImageData(0, 0, 480, 480);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const min = Math.min(...pixels.data.slice(i, i + 3));
      const alpha = Math.max(0, Math.min(1, (248 - min) / 18));
      for (let c = 0; c < 3; c++) pixels.data[i + c] = alpha ? Math.max(0, Math.min(255, (pixels.data[i + c] - 250 * (1 - alpha)) / alpha)) : 0;
      pixels.data[i + 3] = Math.round(alpha * 255);
    }
    ctx.putImageData(pixels, 0, 0);
    const part = (points) => {
      const layer = document.createElement('canvas');
      layer.width = layer.height = 480;
      const c = layer.getContext('2d');
      c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = "white"; c.filter = "blur(1.2px)"; c.fill(); c.filter = "none"; c.globalCompositeOperation = "source-in"; c.drawImage(source, 0, 0);
      return layer;
    };
    const body = part([[180, 0], [300, 0], [270, 87], [282, 103], [283, 128], [275, 156], [280, 211], [302, 300], [302, 480], [178, 480], [178, 300], [200, 211], [205, 156], [197, 128], [198, 103], [210, 87]]);
    const left = part([[0, 76], [208, 76], [217, 103], [211, 126], [195, 136], [0, 136]]);
    const right = part([[480, 76], [272, 76], [263, 103], [269, 126], [285, 136], [480, 136]]);
    for (const [layer, x, isLeft] of [[left, 192, true], [right, 288, false]]) {
      const mask = document.createElement('canvas'); mask.width = mask.height = 480;
      const m = mask.getContext('2d'); m.fillStyle = 'white'; m.beginPath(); m.ellipse(x, 111, 17, 15, 0, 0, Math.PI * 2); m.fill(); m.fillRect(isLeft ? 0 : x, 76, isLeft ? x : 480-x, 60);
      const lc = layer.getContext('2d'); lc.globalCompositeOperation = 'destination-in'; lc.drawImage(mask, 0, 0);
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
    const c = canvas.getContext('2d');
    window.renderSample = (frame, dark) => {
      c.setTransform(1.5, 0, 0, 1.5, 0, 0); c.fillStyle = dark ? '#09090b' : '#fafafa'; c.fillRect(0, 0, 480, 480);
      const rotation = (80 * Math.PI / 180) * (1 + Math.cos(2 * Math.PI * frame / 480)) / 2;
      for (const [layer, x, sign] of [[left, 200, -1], [right, 280, 1]]) {
        c.save(); c.translate(x, 111); c.rotate(sign * rotation); c.scale(0.82, 1); c.drawImage(layer, -x, -111); c.restore();
      }
      c.drawImage(body, 0, 0);
      for (const x of [200, 280]) { c.save(); c.beginPath(); c.ellipse(x, 111, 12, 14, 0, 0, Math.PI * 2); c.clip(); c.drawImage(source, 0, 0); c.restore(); }
      return canvas.toDataURL('image/png').split(',')[1];
    };
  });
  for (const dark of [false, true]) {
    const suffix = dark ? '-dark' : '';
    const output = `${root}/public/exercise-guides/smooth-sample/dumbbell-lateral-raise${suffix}.mp4`;
    const encoder = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
    const finished = new Promise((resolve, reject) => { encoder.on('error', reject); encoder.on('exit', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`))); });
    encoder.stderr.pipe(process.stderr);
    for (let frame = 0; frame < 480; frame++) {
      const data = Buffer.from(await page.evaluate(([frame, dark]) => window.renderSample(frame, dark), [frame, dark]), 'base64');
      if (!dark && [0, 120, 240].includes(frame)) writeFileSync(`${root}/scripts/rigid-${frame}.png`, data);
      if (!encoder.stdin.write(data)) await new Promise(resolve => encoder.stdin.once('drain', resolve));
    }
    encoder.stdin.end(); await finished;
    console.log(`Rendered rigid ${dark ? 'dark' : 'light'} preview: 720x720 / 60fps / 480 frames`);
  }
} finally { await browser.close(); }
