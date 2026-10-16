const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("kettlebell concentration curls one bell with the upper arm supported", () => {
    const steps = methodSteps("kettlebell-concentration-curl", "kettlebell").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("손바닥이 위");
    expect(steps).toContain("무릎 안쪽");
    expect(steps).toContain("반대쪽");
  });
  it("step calf stretch keeps forefeet on the step while lowering heels", () => {
    const steps = methodSteps("step-calf-stretch", "bodyweight").join(" ");
    expect(steps).toContain("앞부분");
    expect(steps).toContain("스텝");
    expect(steps).toContain("뒤꿈치를 아래");
    expect(steps).not.toContain("최대한 높이");
  });
`);fs.writeFileSync(p,s);
