import { describe, expect, it } from "vitest";

import {
  MY_MODE_HREF,
  MY_MODE_KEY,
  MY_MODE_LABEL,
  activeTrainerGroupId,
  currentSwitchLabel,
  isTrainerModePath,
  shouldShowTrainerSwitch,
  trainerSwitchOptions,
  type TrainerSwitchGroup,
} from "@/features/groups/trainer-switch";

const GROUPS: TrainerSwitchGroup[] = [
  { id: "g1", name: "강남점 PT" },
  { id: "g2", name: "온라인반" },
];

describe("트레이너 화면 경로 판정", () => {
  it("트레이너 화면과 그 하위 화면을 전부 트레이너 모드로 본다", () => {
    // 🔴 회원 상세·처방으로 한 단계 들어갔다고 헤더 체크가 '내 운동' 으로 돌아가면 안 된다.
    expect(isTrainerModePath("/groups/g1/trainer")).toBe(true);
    expect(isTrainerModePath("/groups/g1/trainer/members/u9")).toBe(true);
    expect(isTrainerModePath("/groups/g1/trainer/comment/u9")).toBe(true);
    expect(isTrainerModePath("/groups/g1/trainer/billing")).toBe(true);
  });

  it("그룹 화면·그룹원 상세는 트레이너 모드가 아니다", () => {
    expect(isTrainerModePath("/groups")).toBe(false);
    expect(isTrainerModePath("/groups/g1")).toBe(false);
    expect(isTrainerModePath("/groups/g1/member/u9")).toBe(false);
    // 이름이 trainer 로 시작하는 다른 세그먼트에 걸리면 안 된다.
    expect(isTrainerModePath("/groups/g1/trainers")).toBe(false);
    expect(isTrainerModePath("/home")).toBe(false);
  });

  it("트레이너 화면이면 그룹 id 를 집어낸다", () => {
    expect(activeTrainerGroupId("/groups/g2/trainer/members/u1")).toBe("g2");
    expect(activeTrainerGroupId("/home")).toBeNull();
  });
});

describe("스위치 노출 조건", () => {
  it("🔴 소유한 그룹이 없으면(일반 회원) 아예 안 그린다", () => {
    // 그룹에 '참여'만 한 사람에게 '회원 관리' 라는 말이 헤더에 뜨면 안 된다.
    expect(shouldShowTrainerSwitch([])).toBe(false);
  });

  it("그룹장이면 그린다", () => {
    expect(shouldShowTrainerSwitch(GROUPS)).toBe(true);
  });
});

describe("드롭다운 항목", () => {
  it("맨 위가 '내 운동', 그 아래가 내가 맡은 팀들", () => {
    const opts = trainerSwitchOptions(GROUPS, "/home");
    expect(opts.map((o) => o.key)).toEqual([MY_MODE_KEY, "g1", "g2"]);
    expect(opts[0]).toMatchObject({ label: MY_MODE_LABEL, href: MY_MODE_HREF });
    expect(opts[1]).toMatchObject({
      label: "강남점 PT · 회원 관리",
      href: "/groups/g1/trainer",
    });
  });

  it("홈에서는 '내 운동' 에 체크", () => {
    const opts = trainerSwitchOptions(GROUPS, "/home");
    expect(opts.filter((o) => o.active).map((o) => o.key)).toEqual([MY_MODE_KEY]);
    expect(currentSwitchLabel(opts)).toBe(MY_MODE_LABEL);
  });

  it("그 팀 관리 화면에서는 그 팀에 체크", () => {
    const opts = trainerSwitchOptions(GROUPS, "/groups/g2/trainer/members/u1");
    expect(opts.filter((o) => o.active).map((o) => o.key)).toEqual(["g2"]);
    expect(currentSwitchLabel(opts)).toBe("온라인반 · 회원 관리");
  });

  it("🔴 체크는 언제나 정확히 하나다", () => {
    for (const path of [
      "/home",
      "/groups/g1/trainer",
      "/groups/g2/trainer/billing",
      // 내가 그룹장이 아닌 그룹의 트레이너 주소로 들어온 경우(권한이 없어 화면도 안 열린다).
      "/groups/남의그룹/trainer",
    ]) {
      expect(trainerSwitchOptions(GROUPS, path).filter((o) => o.active)).toHaveLength(1);
    }
  });

  it("🔴 목록에 없는 그룹의 트레이너 주소면 '내 운동' 으로 체크가 돌아온다", () => {
    // 체크가 어디에도 없는 스위치는 고장으로 보인다.
    const opts = trainerSwitchOptions(GROUPS, "/groups/gX/trainer");
    expect(opts[0].active).toBe(true);
    expect(currentSwitchLabel(opts)).toBe(MY_MODE_LABEL);
  });
});
