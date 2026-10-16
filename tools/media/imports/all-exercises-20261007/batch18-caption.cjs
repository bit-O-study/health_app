const fs=require('fs');const p='tests/be/logic/motion-caption.test.ts';let t=fs.readFileSync(p,'utf8');
t=t.replace('["jm-press", "machine-hammer-curl", "single-arm-machine-curl"]','["jm-press", "machine-hammer-curl", "single-arm-machine-curl", "wide-grip-bench-press", "machine-preacher-curl", "machine-biceps-curl"]');
const marker='    const corner = motionSpecForUrl("/exercise-guides/ai-v3/corner-pec-stretch-dark.mp4");';
if(!t.includes(marker))throw Error('missing');
t=t.replace(marker,`    for (const id of ["spoto-press", "hip-circle"]) {
      for (const suffix of ["", "-dark"]) {
        const spec = motionSpecForUrl(\`/exercise-guides/ai-v3/\${id}\${suffix}.mp4\`);
        expect(spec?.timing).toBe("continuous");
        for (const time of [0, 2, 3.5, 6, 7.5]) expect(motionPhaseAt(time, spec!)).toBe("move");
      }
    }
    const doorway = motionSpecForUrl("/exercise-guides/ai-v3/doorway-chest-stretch.mp4");
    expect(doorway?.timing).toBe("stretch");
    expect(motionPhaseAt(3, doorway!)).toBe("peak");
`+marker);fs.writeFileSync(p,t);
