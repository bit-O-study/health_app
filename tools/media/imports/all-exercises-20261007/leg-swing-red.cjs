const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("leg swing supports one foot and moves the other leg forward and back", () => {
    const steps = methodSteps("leg-swing", "bodyweight").join(" ");
    expect(steps).toContain("벽");
    expect(steps).toContain("앞뒤로");
    expect(steps).toContain("반대쪽");
    expect(steps).not.toContain("고관절을 뒤로");
  });
`);fs.writeFileSync(p,s);
