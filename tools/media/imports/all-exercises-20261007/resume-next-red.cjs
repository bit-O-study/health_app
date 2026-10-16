const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("floor press uses the floor stop and bent knees without a bench", () => {
    const steps=methodSteps("dumbbell-floor-press", "dumbbell").join(" ");
    for(const word of ["바닥", "무릎", "양발", "오버핸드", "상완", "멈춘다"]) expect(steps).toContain(word);
    expect(steps).not.toContain("벤치");
  });
  it("EZ cable pushdown uses overhand angled grips on a high pulley", () => {
    const steps=methodSteps("ez-bar-cable-pushdown", "cable").join(" ");
    for(const word of ["높은 풀리", "EZ바", "오버핸드", "굽은 손잡이", "상완"]) expect(steps).toContain(word);
  });
`);fs.writeFileSync(p,s);
