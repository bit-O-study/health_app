const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("tempo bench specifies three seconds down, one second on chest and one second up", () => {
    const steps = methodSteps("tempo-bench-press", "barbell").join(" ");
    expect(steps).toContain("3초");
    expect(steps).toContain("가슴에");
    expect(steps).toContain("1초 멈춘");
    expect(steps).toContain("1초에 걸쳐");
  });
`);fs.writeFileSync(p,s);
