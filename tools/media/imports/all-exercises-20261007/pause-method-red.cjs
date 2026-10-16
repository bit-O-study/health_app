const fs=require('fs');
let p='tests/be/logic/video-next-methods.test.ts',s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';
s=s.replace(marker,marker+`
  it("paused bench holds the bar on the chest for one second without bouncing", () => {
    const steps = methodSteps("pause-bench-press", "barbell").join(" ");
    expect(steps).toContain("가슴에");
    expect(steps).toContain("1초");
    expect(steps).toContain("튕기지");
  });
`);fs.writeFileSync(p,s);
