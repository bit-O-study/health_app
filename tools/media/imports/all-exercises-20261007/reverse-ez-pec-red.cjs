const fs=require('fs');const p='tests/be/logic/video-next-methods.test.ts';let s=fs.readFileSync(p,'utf8');const a='describe("continuous video instructions match the exact equipment and movement", () => {';s=s.replace(a,a+`
  it("reverse EZ pushdown uses an underhand grip on bent handles", () => {
    const steps=methodSteps("reverse-grip-ez-pushdown", "cable").join(" ");
    for(const word of ["높은 풀리", "EZ바", "언더핸드", "굽은 손잡이", "상완"]) expect(steps).toContain(word);
  });
  it("pec minor stretch joins the hands behind the back then reaches backward", () => {
    const steps=methodSteps("pec-minor-stretch", "bodyweight").join(" ");
    for(const word of ["등 뒤", "양손", "뒤로", "가슴", "유지"]) expect(steps).toContain(word);
    expect(steps).not.toContain("밀어 올");
  });
`);fs.writeFileSync(p,s);
