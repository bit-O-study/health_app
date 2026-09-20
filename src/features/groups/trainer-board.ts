/**
 * 트레이너 대시보드 — 순수 로직(달성률·챙길 사람 판정·정렬). 테스트 가능.
 *
 * 🔴 **랭킹 화면과 정렬 방향이 반대다.** 그룹 랭킹은 잘한 사람이 위로 온다(경쟁이 목적).
 * 트레이너 화면은 **처지는 사람이 위로** 와야 한다 — 트레이너가 이 화면을 여는 이유는
 * 1등을 보려는 게 아니라 **연락할 사람을 찾으려는 것**이다. 잘하는 회원이 위에 쌓이면
 * 정작 챙겨야 할 사람이 스크롤 아래로 밀린다.
 */

import type { ShareKind } from "@/features/groups/share-prefs";

export type TrainerMember = {
  userId: string;
  name: string;
  /** 이번 주 운동한 날 수(근력+컨디셔닝, 중복 제거). */
  workoutDays: number;
  /** 이번 주 식단을 기록한 날 수. */
  dietDays: number;
  /** 이번 주 목표 운동일수(N분할 또는 직접 짠 주의 비휴식일). 미설정이면 0. */
  targetDays: number;
  /** 마지막으로 운동한 날(YYYY-MM-DD). 기록이 없으면 null. */
  lastWorkout: string | null;
  /** 최근 4주 첫 체중·마지막 체중(kg). 기록이 없으면 null. */
  weightFirst: number | null;
  weightLast: number | null;
  /**
   * 이번 주 **한 세트도 안 한 부위**(라벨).
   *
   * 지금까지 이 화면은 "얼마나 꾸준한가"(운동일수·달성률)만 봤다. 그래서 주 5일을
   * 나와도 매번 상체만 하는 회원을 **여기서는 우등생으로** 보여줬다. 무엇을 했는지
   * 보려면 회원마다 상세로 들어가야 했다 — 10명이면 10번.
   */
  untouchedRegions: string[];
  /**
   * 회원이 **제공을 끈** 항목(설정 → 트레이너 연결). 없으면 전부 제공.
   *
   * 🔴 끈 항목은 **판정에서 빼야지 0 으로 세면 안 된다.** 식단을 비공개로 한 회원을
   *    "이번 주 식단 기록 없음" 으로 띄우면, 트레이너가 하지 않아도 될 연락을 하고
   *    회원은 자기가 끈 것이 무시당했다고 느낀다.
   */
  hidden?: ShareKind[];
};

/**
 * 이번 주 달성률(%). 목표가 없으면 null — **0% 로 만들지 않는다.**
 * 목표를 안 정한 것과 정하고 못 지킨 것은 트레이너에게 전혀 다른 정보다.
 */
export function adherencePct(m: TrainerMember): number | null {
  if (m.targetDays <= 0) return null;
  return Math.min(100, Math.round((m.workoutDays / m.targetDays) * 100));
}

/** 체중 변화(kg, 소수 첫째자리). 비교할 기록이 없으면 null. */
export function weightDelta(m: TrainerMember): number | null {
  if (m.weightFirst === null || m.weightLast === null) return null;
  return Math.round((m.weightLast - m.weightFirst) * 10) / 10;
}

/** `from`(YYYY-MM-DD) 부터 `to` 까지 며칠. 둘 다 서울 기준 날짜 문자열. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** 며칠째 운동 기록이 없나. 기록이 아예 없으면 null(신규 회원과 이탈을 구분한다). */
export function daysSinceWorkout(m: TrainerMember, todayYmd: string): number | null {
  if (!m.lastWorkout) return null;
  return Math.max(0, daysBetween(m.lastWorkout, todayYmd));
}

export type Attention = {
  /** 화면에 그대로 띄울 한 줄. */
  label: string;
  /** 클수록 급하다 — 정렬 기준. */
  weight: number;
  /**
   * 무엇을 해야 하는 신호인가. 화면이 색을 달리 칠하는 데 쓴다.
   * - `absence` 연락할 때다(안 나온다)
   * - `program` 나오고는 있는데 **프로그램**을 고쳐야 한다(늘 같은 데만 한다)
   * - `diet`·`weight` 참고용
   *
   * 섞어서 같은 빨강으로 칠하면 "안 나온 회원"과 "하체를 빼먹는 회원"이 같아 보인다 —
   * 트레이너가 할 일이 전혀 다른데.
   */
  kind: "absence" | "program" | "diet" | "weight" | "private";
};

/** 비공개 칩에 쓰는 짧은 이름(처방 허용은 열람이 아니라 여기 안 나온다). */
const HIDDEN_LABEL: Partial<Record<ShareKind, string>> = {
  workout: "운동",
  diet: "식단",
  body: "체중",
};

/** 며칠을 쉬면 '연락할 때'로 볼 것인가. 주 3회 회원도 이틀은 정상이라 3일부터 본다. */
export const STALE_DAYS = 3;

/**
 * 이 회원을 챙겨야 하는 이유들. 없으면 빈 배열(= 잘 하고 있음).
 *
 * 🔴 **"운동을 안 한다" 와 "기록이 아예 없다" 를 나눈다.** 가입만 하고 한 번도 안 한
 * 회원은 이탈이 아니라 **온보딩 실패**다 — 트레이너가 할 말이 완전히 다르다.
 */
export function attentionOf(m: TrainerMember, todayYmd: string): Attention[] {
  const out: Attention[] = [];
  const hidden = new Set<ShareKind>(m.hidden ?? []);

  // 🔴 비공개 항목은 **맨 먼저 한 줄로** 알린다. 숫자가 0 인 이유가 '안 했다' 가 아니라
  //    '안 보여준다' 라는 걸 모르면 트레이너는 없는 문제를 쫓는다.
  //    weight 0 — 급한 일이 아니다(정렬을 흔들면 안 된다).
  if (hidden.size > 0) {
    out.push({
      label: `${[...hidden]
        .map((k) => HIDDEN_LABEL[k])
        .filter(Boolean)
        .join("·")} 비공개`,
      weight: 0,
      kind: "private",
    });
  }

  const since = hidden.has("workout") ? null : daysSinceWorkout(m, todayYmd);

  // 운동 기록을 안 보여주는 회원에게는 결석·프로그램 판정을 하지 않는다(근거가 없다).
  if (hidden.has("workout")) {
    // 아무 판정도 하지 않는다 — 위의 '비공개' 한 줄이 전부다.
  } else if (since === null) {
    out.push({ label: "아직 운동 기록이 없어요", weight: 100, kind: "absence" });
  } else if (since >= STALE_DAYS) {
    out.push({
      label: `${since}일째 운동 기록이 없어요`,
      weight: 50 + since,
      kind: "absence",
    });
  }

  const pct = hidden.has("workout") ? null : adherencePct(m);
  if (pct !== null && pct < 50 && since !== null) {
    out.push({
      label: `이번 주 목표의 ${pct}%`,
      weight: 40 - Math.floor(pct / 10),
      kind: "absence",
    });
  }

  // 🔴 **운동을 한 회원에게만** 말한다. 이번 주 아예 안 나온 회원에게 "가슴 0세트"는
  //    당연한 소리이고, 정작 중요한 "며칠째 기록 없음"을 밀어낸다.
  if (since !== null && m.workoutDays > 0 && m.untouchedRegions.length > 0) {
    // 🔴 잘라서 "외 2" 로 쓰지 않는다. 부위 이름은 한두 글자라 여섯 개를 다 써도 한 줄이고,
    //    무엇을 자를지에 정답이 없다 — 트레이너가 정작 찾던 '하체'가 "외 2" 에 묻힌다.
    out.push({
      label: `이번 주 ${m.untouchedRegions.join("·")} 0세트`,
      // 결석(50+)보다는 낮고 식단 누락(10)보다는 높다 — 나오고 있는 회원의 문제라
      //   연락의 급함은 덜하지만, 프로그램을 고쳐야 한다는 신호다.
      weight: 20,
      kind: "program",
    });
  }

  if (!hidden.has("diet") && m.dietDays === 0) {
    out.push({ label: "이번 주 식단 기록 없음", weight: 10, kind: "diet" });
  }

  const delta = hidden.has("body") ? null : weightDelta(m);
  // 체중은 방향을 우리가 판단하지 않는다(증량이 목표인 회원도 있다). 눈에 띄는 변화만 알린다.
  if (delta !== null && Math.abs(delta) >= 2) {
    out.push({
      label: `체중 ${delta > 0 ? "+" : ""}${delta}kg`,
      weight: 5,
      kind: "weight",
    });
  }
  return out;
}

/** 이 회원의 급한 정도. 클수록 위로. */
export function urgencyOf(m: TrainerMember, todayYmd: string): number {
  return attentionOf(m, todayYmd).reduce((sum, a) => sum + a.weight, 0);
}

/**
 * 트레이너가 볼 순서 — **챙길 사람이 위로**. 같으면 이름순(순서가 흔들리면 매번
 * 다른 사람이 위에 와서 "어제 본 그 회원"을 다시 못 찾는다).
 */
export function sortForTrainer(
  members: TrainerMember[],
  todayYmd: string,
): TrainerMember[] {
  return [...members].sort(
    (a, b) =>
      urgencyOf(b, todayYmd) - urgencyOf(a, todayYmd) ||
      a.name.localeCompare(b.name, "ko"),
  );
}

/**
 * 화면 맨 위 요약 — 담당 인원 중 몇 명을 챙겨야 하나.
 *
 * 🔴 '비공개' 는 챙길 일이 아니다. 회원이 정보 제공을 끈 것을 '챙길 회원' 으로 세면
 *    할 일이 없는데도 숫자가 올라가 화면 맨 위가 거짓말을 한다.
 */
export function trainerSummary(members: TrainerMember[], todayYmd: string) {
  const needs = members.filter((m) =>
    attentionOf(m, todayYmd).some((a) => a.kind !== "private"),
  ).length;
  const workedToday = members.filter((m) => m.lastWorkout === todayYmd).length;
  return { total: members.length, needsAttention: needs, workedToday };
}
