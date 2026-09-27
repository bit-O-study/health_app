import type { FoodItem } from "./food-catalog-types";

type EggServing = {
  baseCount: number | null;
  baseGrams: number | null;
  unitGrams: number | null;
  estimated: boolean;
};

/** 통계용 100g 기준과 실제 먹은 개수를 구분한다. 계란 요리/부분육에는 적용하지 않는다. */
export function getEggServing(food: Pick<FoodItem, "name" | "amount">): EggServing | null {
  const name = food.name.replace(/\s+/g, "");
  if (/(찜|말이|계란국|달걀국|계란탕|달걀탕|빵|샌드|샐러드|볶음|덮밥|흰자|노른자|분말|소스|메추리|스크램블)/.test(name)) return null;
  if (!/(계란|달걀|구운란|훈제란|반숙란|완숙란|유정란)/.test(name)) return null;
  const amount = food.amount.replace(/\s+/g, "");
  const counted = amount.match(/^(\d+)개(?:\((\d+(?:\.\d+)?)g\))?$/);
  if (counted && Number(counted[1]) > 0) {
    const baseCount = Number(counted[1]);
    const baseGrams = counted[2] ? Number(counted[2]) : null;
    return { baseCount, baseGrams, unitGrams: baseGrams ? baseGrams / baseCount : null, estimated: false };
  }
  const grams = amount.match(/^(\d+(?:\.\d+)?)g$/);
  if (!grams || Number(grams[1]) <= 0) return null;
  // 제품별 중량이 없는 데이터의 명시적 추정값. 화면에서 수정할 수 있다.
  return { baseCount: null, baseGrams: Number(grams[1]), unitGrams: 50, estimated: true };
}

export function getEggPortion(serving: EggServing, count: number, unitGrams = serving.unitGrams) {
  if (!Number.isInteger(count) || count < 1) return null;
  if (serving.baseGrams !== null) {
    if (unitGrams === null || !Number.isFinite(unitGrams) || unitGrams <= 0) return null;
    const total = Math.round(count * unitGrams * 10) / 10;
    const approximate = serving.estimated && unitGrams === serving.unitGrams;
    return {
      factor: count * unitGrams / serving.baseGrams,
      amount: `${count}개(${approximate ? "약 " : ""}${total}g)`,
    };
  }
  return { factor: count / serving.baseCount!, amount: `${count}개` };
}
