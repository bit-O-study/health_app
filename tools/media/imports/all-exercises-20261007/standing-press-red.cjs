const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("standing barbell press starts in front of the shoulders and uses no leg drive", () => {
    const steps = methodSteps("barbell-overhead-press", "barbell").join(" ");
    expect(steps).toContain("서서");
    expect(steps).toContain("어깨 앞");
    expect(steps).toContain("다리 반동 없이");
    expect(steps).toContain("머리 위");
  });
`);fs.writeFileSync(p,s);
