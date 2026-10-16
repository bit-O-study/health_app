const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("flat dumbbell bench uses palms toward feet and a supported torso", () => {
    const steps = methodSteps("dumbbell-bench-press", "dumbbell").join(" ");
    expect(steps).toContain("평평한 벤치");
    expect(steps).toContain("손바닥이 발 쪽");
    expect(steps).toContain("가슴 위");
  });
`);fs.writeFileSync(p,s);
