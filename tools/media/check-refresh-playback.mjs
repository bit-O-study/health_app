import fs from 'node:fs';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
const batch = process.argv[2] || 'parallel';
if (!['parallel', 'arms'].includes(batch)) throw new Error('Unknown batch');
const ids = JSON.parse(fs.readFileSync(`tools/media/motion-refresh/${batch}-batch.json`, 'utf8')).results.map(x => x.id);
const browser = await chromium.launch();
const tiles = [], results = [];
let cursor = 0;
try {
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < ids.length * 2) {
      const index = cursor++, id = ids[Math.floor(index / 2)], suffix = index % 2 ? '-dark' : '';
      console.log(`${id}${suffix}: loading`);
      const bytes = fs.readFileSync(`public/exercise-guides/refresh-candidates/${id}${suffix}.mp4`);
      const page = await browser.newPage();
      await page.setContent(`<video muted loop src="data:video/mp4;base64,${bytes.toString('base64')}"></video>`);
      await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
      for (const [k, time] of [0.05, 2, 4, 6, 7.983].entries()) {
        const data = await page.evaluate(async time => {
          const video = document.querySelector('video');
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Seek timeout at ${time}`)), 10000);
            video.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
            video.currentTime = time;
          });
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
          canvas.getContext('2d').drawImage(video, 0, 0, 720, 720);
          return canvas.toDataURL().split(',')[1];
        }, time);
        tiles.push({ input: await sharp(Buffer.from(data, 'base64')).resize(160, 160).toBuffer(), left: k * 160, top: index * 188 + 28 });
      }
      tiles.push({ input: Buffer.from(`<svg width="800" height="28"><rect width="800" height="28" fill="#17221c"/><text x="8" y="20" fill="white" font-size="16">${id}${suffix}</text></svg>`), left: 0, top: index * 188 });
      await page.evaluate(() => { const video = document.querySelector('video'); video.currentTime = 0; return video.play(); });
      await page.waitForTimeout(8300);
      const result = await page.evaluate(() => {
        const video = document.querySelector('video'), quality = video.getVideoPlaybackQuality();
        return { duration: video.duration, width: video.videoWidth, time: video.currentTime, error: video.error?.message || null, dropped: quality.droppedVideoFrames, total: quality.totalVideoFrames };
      });
      results[index] = { ...result, id: id + suffix, sha256: createHash('sha256').update(bytes).digest('hex') };
      await page.close();
      if (result.error || result.duration !== 8 || result.width !== 720 || result.time > 1) throw new Error(`Playback failed: ${id}${suffix}`);
      console.log(`${id}${suffix}: loop passed`);
    }
  }));
  await sharp({ create: { width: 800, height: ids.length * 2 * 188, channels: 3, background: '#fafafa' } }).composite(tiles).png().toFile(`.verify-shots/motion-refresh/${batch}-batch.png`);
  fs.writeFileSync(`tools/media/motion-refresh/${batch}-playback.json`, JSON.stringify(results, null, 2) + '\n');
} finally { await browser.close(); }
