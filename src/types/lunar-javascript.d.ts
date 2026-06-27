/**
 * lunar-javascript / korean-lunar-calendar 최소 타입 선언.
 * 라이브러리가 타입을 제공하지 않아 직접 선언한다.
 *
 * - 음력 공휴일(설날·추석·부처님오신날)은 한국 공식(KASI) 날짜와 일치하는
 *   korean-lunar-calendar로 변환한다(중국 음력 기준 lunar-javascript와 일부 연도 1일 차이).
 * - 복날은 절기(하지·입추)+경일이 필요해 lunar-javascript를 쓴다(경일=일간지는 시차 무관).
 */
declare module "korean-lunar-calendar" {
  class KoreanLunarCalendar {
    setLunarDate(
      year: number,
      month: number,
      day: number,
      intercalation: boolean,
    ): boolean;
    setSolarDate(year: number, month: number, day: number): boolean;
    getSolarCalendar(): { year: number; month: number; day: number };
    getLunarCalendar(): {
      year: number;
      month: number;
      day: number;
      intercalation: boolean;
    };
  }
  export default KoreanLunarCalendar;
}

declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    toYmd(): string;
    getLunar(): Lunar;
    next(days: number): Solar;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    getSolar(): Solar;
    /** 일간(干) 인덱스. 0=甲 … 6=庚 … 9=癸. */
    getDayGanIndex(): number;
    getDayGan(): string;
    /** 절기명(한자) → 해당 Solar. 예: "夏至", "立秋". */
    getJieQiTable(): Record<string, Solar>;
  }
}
