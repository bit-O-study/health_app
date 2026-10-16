const fs=require('fs');let p='tests/be/logic/video-next-methods.test.ts',s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("Larsen press holds feet off the floor with extended legs", () => {
    const steps = methodSteps("larsen-press", "barbell").join(" ");
    expect(steps).toContain("다리를 앞으로");
    expect(steps).toContain("공중");
    expect(steps).toContain("가슴");
  });
  it("seated cable concentration uses a low pulley bar and knee support", () => {
    const steps = methodSteps("cable-concentration-curl", "cable").join(" ");
    expect(steps).toContain("앉아");
    expect(steps).toContain("무릎 안쪽");
    expect(steps).toContain("직선 바");
    expect(steps).not.toContain("옆구리");
  });
  it("standing quad stretch uses support and holds the same-side ankle", () => {
    const steps = methodSteps("standing-quad-stretch", "bodyweight").join(" ");
    expect(steps).toContain("벽");
    expect(steps).toContain("발목");
    expect(steps).toContain("같은 쪽 손");
    expect(steps).toContain("반대쪽");
  });
`);fs.writeFileSync(p,s);
