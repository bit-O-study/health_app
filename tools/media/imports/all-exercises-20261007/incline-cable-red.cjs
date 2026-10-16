const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("incline cable curl uses an inclined backrest and two underhand D handles", () => {
    const steps = methodSteps("incline-cable-curl", "cable").join(" ");
    expect(steps).toContain("45도");
    expect(steps).toContain("등받이");
    expect(steps).toContain("D핸들");
    expect(steps).toContain("손바닥이 위");
    expect(steps).toContain("상완");
  });
`);fs.writeFileSync(p,s);
