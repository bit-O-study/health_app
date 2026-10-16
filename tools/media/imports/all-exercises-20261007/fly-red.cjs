const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("flat dumbbell fly keeps elbows softly bent while opening and closing arms", () => {
    const steps = methodSteps("dumbbell-fly", "dumbbell").join(" ");
    expect(steps).toContain("서로 마주");
    expect(steps).toContain("팔꿈치 각도를 유지");
    expect(steps).toContain("양옆으로");
    expect(steps).toContain("모은다");
    expect(steps).not.toContain("밀어 올리");
  });
`);fs.writeFileSync(p,s);
