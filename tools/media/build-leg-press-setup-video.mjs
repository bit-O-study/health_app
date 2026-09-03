import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const mode = process.argv[2] === "performance" ? "performance" : "setup";
const frameDir = path.join(root, "public", "exercise-guides", `leg-press-${mode}-frames`);
const frameNames = (await readdir(frameDir)).filter((name) => name.endsWith(".png")).sort();
const output = path.join(root, "public", "exercise-guides", `leg-press-${mode}.webm`);

const frames = await Promise.all(
  frameNames.map(async (name) => {
    const bytes = await readFile(path.join(frameDir, name));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  }),
);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent("<canvas width='1280' height='720'></canvas>");
  const base64 = await page.evaluate(async (sources) => {
    const canvas = document.querySelector("canvas");
    const context = canvas.getContext("2d");
    const images = await Promise.all(
      sources.map(
        (source) =>
          new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = source;
          }),
      ),
    );
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000 });
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise((resolve) => (recorder.onstop = resolve));
    const draw = (image, alpha = 1) => {
      context.save();
      context.globalAlpha = alpha;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      context.restore();
    };
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    recorder.start(250);
    draw(images[0]);
    await wait(1_200);
    for (let index = 1; index < images.length; index += 1) {
      for (let step = 1; step <= 15; step += 1) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        draw(images[index - 1]);
        draw(images[index], step / 15);
        await wait(1000 / 30);
      }
      await wait(1_200);
    }
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());

    const bytes = new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
  }, frames);
  await writeFile(output, Buffer.from(base64, "base64"));
  const metadata = await page.evaluate(async (videoBase64) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = `data:video/webm;base64,${videoBase64}`;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    video.muted = true;
    video.playbackRate = 4;
    const ended = new Promise((resolve) => (video.onended = () => resolve(true)));
    await video.play();
    const playedToEnd = await Promise.race([
      ended,
      new Promise((resolve) => setTimeout(() => resolve(false), 10_000)),
    ]);
    return {
      duration: Number.isFinite(video.duration) ? video.duration : null,
      width: video.videoWidth,
      height: video.videoHeight,
      playedToEnd,
    };
  }, base64);
  console.log(output, metadata);
} finally {
  await browser.close();
}
