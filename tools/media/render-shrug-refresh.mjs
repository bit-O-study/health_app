import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Per-exercise constraint: hanging arms/weights translate together by 12px;
// the head, central torso, hips and feet stay fixed. No temporal interpolation.
const id = 'dumbbell-shrug';
const backup = 'tools/media/motion-refresh/sources';
const output = 'public/exercise-guides/refresh-candidates';
mkdirSync(backup, { recursive: true }); mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const themes = [];
try {
  const page = await browser.newPage();
  for (const suffix of ['', '-dark']) {
    const source = `${backup}/${id}${suffix}.mp4`;
    if (!existsSync(source)) copyFileSync(`public/exercise-guides/ai-v3/${id}${suffix}.mp4`, source);
    await page.setContent(`<video muted src="data:video/mp4;base64,${readFileSync(source).toString('base64')}"></video>`);
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    await page.evaluate(async () => {
      const video = document.querySelector('video'); video.currentTime = 0.05;
      await new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
      const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 480;
      textureCanvas.getContext('2d').drawImage(video, 0, 0, 480, 480);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
      if (!gl) throw new Error('WebGL unavailable');
      const shader = (type, source) => {
        const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      const program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}'));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `precision highp float;
        varying vec2 uv; uniform sampler2D tex; uniform float lift;
        float weight(vec2 p) {
          float arms=max(1.-smoothstep(194.,213.,p.x),smoothstep(274.,294.,p.x));
          float leftWeight=(1.-smoothstep(220.,226.,p.x))*smoothstep(230.,238.,p.y)*(1.-smoothstep(298.,308.,p.y));
          float rightWeight=smoothstep(277.,283.,p.x)*smoothstep(230.,238.,p.y)*(1.-smoothstep(298.,308.,p.y));
          return max(max(leftWeight,rightWeight),arms*smoothstep(76.,110.,p.y)*(1.-smoothstep(300.,334.,p.y)));
        }
        void main(){vec2 p=uv*480.;vec2 q=p;
          for(int i=0;i<8;i++){q.y=p.y+lift*weight(q);}
          gl_FragColor=texture2D(tex,q/480.);
        }`));
      gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
      const lift = gl.getUniformLocation(program, 'lift');
      window.renderShrug = frame => {
        gl.uniform1f(lift, 6 * (1 - Math.cos(2 * Math.PI * frame / 480)));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        return canvas.toDataURL().split(',')[1];
      };
    });
    const file = `${output}/${id}${suffix}.mp4`;
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'slow', '-crf', '18', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file]);
    const finished = new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`))); });
    child.stderr.pipe(process.stderr);
    for (let frame = 0; frame < 480; frame++) {
      const data = Buffer.from(await page.evaluate(frame => window.renderShrug(frame), frame), 'base64');
      if ([0,120,240].includes(frame)) writeFileSync(`${output}/${id}${suffix}-${frame}.png`, data);
      if (!child.stdin.write(data)) await new Promise(resolve => child.stdin.once('drain', resolve));
    }
    child.stdin.end(); await finished;
    themes.push({ suffix, sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), bytes: readFileSync(file).length });
    console.log(`${id}${suffix}: rendered`);
  }
} finally { await browser.close(); }
writeFileSync('tools/media/motion-refresh/shrug-candidate.json', JSON.stringify({ id, renderer: 'constrained-shrug-v1', timing: 'smooth', width: 720, height: 720, seconds: 8, fps: 60, status: 'pending-visual-review', themes }, null, 2) + '\n');
