/**
 * 홈 상단 헤더의 **트레이너 모드 전환** — 순수 로직(테스트 가능). DB 접근 없음.
 *
 * 🔴 **일반 회원에게는 존재 자체가 보이면 안 된다.** 이 앱의 그룹은 친구 모임이기도
 *    해서, 그룹에 속해 있다는 것만으로 "회원 관리" 라는 말이 헤더에 뜨면 자기가 누군가를
 *    관리할 수 있다는 오해를 준다. 전환 스위치는 **자기가 만든 그룹(그룹장=트레이너)이
 *    하나라도 있을 때만** 그린다 — 그래서 판정 기준이 "그룹 멤버"가 아니라 **"소유한 그룹"** 이다.
 *
 * 🔴 **현재 위치는 경로로만 정한다.** 전환 상태를 따로 저장(쿠키·localStorage)하면
 *    뒤로가기·딥링크로 들어온 화면과 헤더가 어긋난다("회원 관리"에 체크가 있는데 홈이
 *    떠 있는" 상태). 경로가 곧 상태다.
 */

export type TrainerSwitchGroup = {
  id: string;
  /** 그룹 이름(= 트레이너가 관리하는 팀 이름). */
  name: string;
};

export type TrainerSwitchOption = {
  /** React key 겸 테스트 식별자. */
  key: string;
  /** 드롭다운에 그대로 쓰는 한 줄. */
  label: string;
  href: string;
  /** 지금 이 화면인가(체크 표시). */
  active: boolean;
};

/** 내 운동(일반 모드) 쪽 항목의 고정 키·라벨·경로. */
export const MY_MODE_KEY = "me";
export const MY_MODE_LABEL = "내 운동";
export const MY_MODE_HREF = "/home";

/** 트레이너 화면 경로: `/groups/<id>/trainer` 이하 전부. */
const TRAINER_PATH = /^\/groups\/([^/]+)\/trainer(?:\/|$)/;

/**
 * 지금 트레이너 화면인가. 하위 화면(회원 통계·처방·코멘트·배정·요금제)도 전부 포함한다 —
 * 회원 상세로 한 단계 들어갔다고 헤더 체크가 "내 운동" 으로 돌아가면 안 된다.
 */
export function isTrainerModePath(pathname: string): boolean {
  return TRAINER_PATH.test(pathname);
}

/** 트레이너 화면이라면 그 그룹 id. 아니면 null. */
export function activeTrainerGroupId(pathname: string): string | null {
  return TRAINER_PATH.exec(pathname)?.[1] ?? null;
}

/**
 * 스위치를 그릴 것인가. **소유한 그룹이 하나도 없으면 안 그린다**(일반 회원).
 */
export function shouldShowTrainerSwitch(groups: TrainerSwitchGroup[]): boolean {
  return groups.length > 0;
}

/**
 * 헤더 드롭다운 항목 — 맨 위가 "내 운동", 그 아래가 내가 맡은 팀들.
 *
 * 활성 항목은 **항상 정확히 하나**다. 트레이너 화면인데 그 그룹이 목록에 없으면
 * (그룹장 자리를 넘겼거나 링크로 남의 그룹에 들어온 경우) 어디에도 체크가 없는 대신
 * "내 운동" 으로 돌아간다 — 체크가 없는 스위치는 고장으로 보인다.
 */
export function trainerSwitchOptions(
  groups: TrainerSwitchGroup[],
  pathname: string,
): TrainerSwitchOption[] {
  const activeId = activeTrainerGroupId(pathname);
  const ownsActive = activeId !== null && groups.some((g) => g.id === activeId);

  return [
    {
      key: MY_MODE_KEY,
      label: MY_MODE_LABEL,
      href: MY_MODE_HREF,
      active: !ownsActive,
    },
    ...groups.map((g) => ({
      key: g.id,
      label: `${g.name} · 회원 관리`,
      href: `/groups/${g.id}/trainer`,
      active: ownsActive && g.id === activeId,
    })),
  ];
}

/** 헤더 버튼에 접힌 채로 보이는 현재 모드 이름. */
export function currentSwitchLabel(options: TrainerSwitchOption[]): string {
  return options.find((o) => o.active)?.label ?? MY_MODE_LABEL;
}
