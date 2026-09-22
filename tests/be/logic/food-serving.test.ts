import { describe, expect, it } from "vitest";
import { getEggPortion, getEggServing } from "@/features/diet/food-serving";

describe("계란 개수와 영양 기준량", () => {
  it("맥반석 구운계란 100g 데이터는 개수 선택에 명시적 추정 중량을 사용한다", () => {
    const serving = getEggServing({ name: "맥반석으로 맛있게 구운계란", amount: "100g" })!;
    expect(serving.estimated).toBe(true);
    expect(getEggPortion(serving, 1)).toEqual({ factor: 0.5, amount: "1개(약 50g)" });
    expect(getEggPortion(serving, 2)).toEqual({ factor: 1, amount: "2개(약 100g)" });
    expect(getEggPortion(serving, 2, 45)).toEqual({ factor: 0.9, amount: "2개(90g)" });
  });
  it("제품에 개당 중량이 있으면 해당 중량을 우선한다", () => {
    const serving = getEggServing({ name: "구운계란", amount: "2개(90g)" })!;
    expect(serving.estimated).toBe(false);
    expect(getEggPortion(serving, 1)).toEqual({ factor: 0.5, amount: "1개(45g)" });
  });
  it("원래 1개 기준의 삶은 계란은 2개를 담으면 영양값이 정확히 두 배다", () => {
    const serving = getEggServing({ name: "삶은 계란", amount: "1개" })!;
    expect(getEggPortion(serving, 2)).toEqual({ factor: 2, amount: "2개" });
  });
  it.each(["계란말이", "계란찜", "계란국", "계란빵", "계란흰자", "메추리알", "맥반석 오징어", "달걀 샐러드"])("%s는 통계란 개수로 환산하지 않는다", (name) => {
    expect(getEggServing({ name, amount: "100g" })).toBeNull();
  });
  it.each(["구운란", "맥반석 구운 유정란", "훈제란", "반숙란", "국내산 구운계란"])("%s도 개수 선택을 지원한다", (name) => {
    expect(getEggServing({ name, amount: "100g" })?.unitGrams).toBe(50);
  });
  it("중량 기준이 불명확한 데이터를 임의로 환산하지 않는다", () => {
    expect(getEggServing({ name: "구운계란", amount: "1봉" })).toBeNull();
    expect(getEggServing({ name: "구운계란", amount: "0g" })).toBeNull();
  });
  it("잘못 입력한 개수·중량으로 저장하지 않는다", () => {
    const serving = getEggServing({ name: "구운계란", amount: "100g" })!;
    for (const count of [0, -1, 0.5, NaN]) expect(getEggPortion(serving, count)).toBeNull();
    for (const grams of [0, -1, NaN]) expect(getEggPortion(serving, 1, grams)).toBeNull();
  });
});
