/**
 * 런닝 모드 게임 — 3레인 엔드리스 러너(템플런 류) 순수 상태 기계.
 * 캔버스/카메라와 무관하게 상태만 전진시킨다(테스트 가능). 렌더는 호출부가 한다.
 *
 * 좌표: 레인은 -1(왼)·0(가운데)·1(오른). z 는 플레이어로부터의 거리(0=플레이어 평면,
 * 큰 값=멀리 앞). 장애물은 z 가 줄며 다가온다. jumpY 0=땅.
 */

import { clamp01, type Lane } from "@/features/running/controls";

export type Obstacle = {
  id: number;
  lane: Lane;
  z: number;
  kind: "block" | "coin";
  got?: boolean; // 코인 획득 처리됨
};

export type GameState = {
  status: "playing" | "over";
  targetLane: Lane;
  playerLane: number; // 부드럽게 따라가는 현재 위치(-1..1)
  jumpY: number; // 0=땅
  vy: number;
  onGround: boolean;
  obstacles: Obstacle[];
  speed: number; // 현재 전진 속도(units/s) — 달리기 강도로 변함
  distance: number;
  coins: number;
  spawnAt: number; // 다음 스폰 distance 임계
  nextId: number;
};

export type StepInput = {
  targetLane: Lane;
  /** 이번 프레임에 점프 시작(에지). */
  jump: boolean;
  /** 달리기 강도 0..1 (제자리 달리기 정도). */
  runIntensity: number;
};

const SPEED_MIN = 2.5;
const SPEED_MAX = 15;
const JUMP_V = 3.4;
const GRAVITY = 9.5;
const JUMP_CLEAR = 0.55; // 이 높이 이상이면 블록을 넘는다
const HIT_Z = 0.6; // 충돌 판정 z 반경
const SPAWN_Z = 26; // 스폰 시 앞쪽 거리
const SPAWN_GAP = 6; // 스폰 간격(distance)

export function createGame(): GameState {
  return {
    status: "playing",
    targetLane: 0,
    playerLane: 0,
    jumpY: 0,
    vy: 0,
    onGround: true,
    obstacles: [],
    speed: SPEED_MIN,
    distance: 0,
    coins: 0,
    spawnAt: SPAWN_GAP,
    nextId: 1,
  };
}

const approach = (cur: number, target: number, t: number) =>
  cur + (target - cur) * Math.min(1, Math.max(0, t));

const LANES: Lane[] = [-1, 0, 1];

/** 한 프레임 전진. rng 는 스폰 난수(테스트는 고정값 주입). */
export function stepGame(
  s: GameState,
  input: StepInput,
  dtMs: number,
  rng: () => number = Math.random,
): GameState {
  if (s.status === "over") return s;
  const dt = Math.min(0.05, Math.max(0, dtMs / 1000)); // 큰 프레임 점프 클램프

  // 속도 — 달리기 강도로. 가만히 있으면 거의 멈춤.
  const targetSpeed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * clamp01(input.runIntensity);
  const speed = approach(s.speed, targetSpeed, dt * 3);

  // 레인 부드럽게 이동
  const playerLane = approach(s.playerLane, input.targetLane, dt * 9);

  // 점프 물리
  let jumpY = s.jumpY;
  let vy = s.vy;
  let onGround = s.onGround;
  if (input.jump && onGround) {
    vy = JUMP_V;
    onGround = false;
  }
  if (!onGround) {
    vy -= GRAVITY * dt;
    jumpY = jumpY + vy * dt;
    if (jumpY <= 0) {
      jumpY = 0;
      vy = 0;
      onGround = true;
    }
  }

  // 장애물 전진 + 지나간 것 제거
  const obstacles = s.obstacles
    .map((o) => ({ ...o, z: o.z - speed * dt }))
    .filter((o) => o.z > -1.5);

  const distance = s.distance + speed * dt;

  // 스폰(distance 기준) — 멈춰 있어도 폭주 안 하게 distance 로 게이트
  let spawnAt = s.spawnAt;
  let nextId = s.nextId;
  let guard = 0;
  while (distance >= spawnAt && guard++ < 8) {
    const lane = LANES[Math.floor(rng() * 3)] ?? 0;
    const kind: Obstacle["kind"] = rng() < 0.35 ? "coin" : "block";
    obstacles.push({ id: nextId++, lane, z: SPAWN_Z, kind });
    spawnAt += SPAWN_GAP * (0.8 + rng() * 0.5);
  }

  // 충돌/코인
  let status: GameState["status"] = s.status;
  let coins = s.coins;
  for (const o of obstacles) {
    const near = Math.abs(o.z) < HIT_Z;
    const sameLane = Math.abs(playerLane - o.lane) < 0.45;
    if (!near || !sameLane) continue;
    if (o.kind === "coin") {
      if (!o.got) {
        o.got = true;
        coins += 1;
      }
    } else if (jumpY < JUMP_CLEAR) {
      status = "over";
    }
  }

  return {
    ...s,
    status,
    targetLane: input.targetLane,
    playerLane,
    jumpY,
    vy,
    onGround,
    obstacles,
    speed,
    distance,
    coins,
    spawnAt,
    nextId,
  };
}

export const GAME_TUNING = { SPEED_MIN, SPEED_MAX, JUMP_CLEAR, HIT_Z, SPAWN_Z };
