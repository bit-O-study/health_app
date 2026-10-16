const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const a='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(a,a+`
  it("single arm floor press supports the free palm on the floor", () => {
    const steps=methodSteps("single-arm-dumbbell-floor-press", "dumbbell").join(" ");
    for(const word of ["한 손", "오버핸드", "반대 팔", "손바닥", "바닥", "무릎", "상완"]) expect(steps).toContain(word);
  });
`);fs.writeFileSync(p,s);
