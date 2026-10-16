const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const marker='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(marker,marker+`
  it("upper trap stretch sits with planted feet and combines lateral then forward neck bend", () => {
    const steps=methodSteps("upper-trap-stretch", "bodyweight").join(" ");
    for(const word of ["의자", "양발", "귀", "어깨", "턱", "가슴"]) expect(steps).toContain(word);
    expect(steps).not.toContain("손으로 당");
  });
`);fs.writeFileSync(p,s);
