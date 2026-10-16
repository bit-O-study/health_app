const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("reverse grip bench uses an underhand grip and lowers to the lower chest", () => {
    const steps = methodSteps("reverse-grip-bench-press", "barbell").join(" ");
    expect(steps).toContain("언더핸드");
    expect(steps).toContain("아랫가슴");
    expect(steps).toContain("엄지");
  });
  it("lateral leg swing faces the wall and swings across the front of the body", () => {
    const steps = methodSteps("lateral-leg-swing", "bodyweight").join(" ");
    expect(steps).toContain("벽을 마주");
    expect(steps).toContain("몸 앞");
    expect(steps).toContain("좌우로");
    expect(steps).toContain("반대쪽");
  });
`);fs.writeFileSync(p,s);
