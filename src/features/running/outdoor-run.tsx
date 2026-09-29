"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import {
  addPoint,
  avgPaceSecPerKm,
  emptyTrack,
  formatDistanceKm,
  formatDuration,
  formatPace,
  haversineMeters,
  reanchorTrack,
  recentPaceSecPerKm,
  runIntensityFromSpeed,
  speedKmh,
  type GeoPoint,
  type RunTrack,
} from "@/features/running/geo";
import {
  activeElapsedMs,
  gpsSignalLevel,
  resumedStart,
  shouldAutoPause,
  type PauseKind,
} from "@/features/running/run-pause";
import { HoldToEnd } from "@/features/running/components/hold-to-end";
import { RunCountdown } from "@/features/running/components/run-countdown";
import { useWakeLock } from "@/features/running/use-wake-lock";
import {
  startGeoWatch,
  type GeoFix,
  type GeoWatch,
} from "@/features/running/background-geo";
import { openLocationSettings } from "@/features/running/native";
import { RunLeaderboard } from "@/features/running/components/run-leaderboard";
import { MIN_OUTDOOR_DISTANCE_M } from "@/features/running/run-session";
import {
  newRunCheckpoint,
  readRunCheckpoint,
  writeRunCheckpoint,
  type RunCheckpoint,
} from "@/features/running/run-checkpoint";
import { runSaveMessage, saveFinishedRun, type RunSaveResult } from "@/features/running/run-save";

// 무거운 3D 씬은 '시작' 이후에만 지연 로드(첫 진입 번들 가볍게 — PWA 안전).
const ZenScene = dynamic(() => import("@/features/running/zen-scene"), {
  ssr: false,
  loading: () => null,
});

type Phase = "checking" | "intro" | "playing" | "done" | "error";
type Metrics = { meters: number; kmh: number; elapsedSec: number };
// 이 거리(m) 미만이면 '실제로 달리지 않음'으로 보고 기록하지 않는다(들어왔다 나간 경우).
// 오류 종류 — 권한 거부 / GPS(위치정보) 꺼짐 / 신호 못찾음 / 기타.
type ErrKind = "denied" | "gps-off" | "timeout" | "other" | null;

/**
 * 야외 런닝 — GPS(위치)로 캐릭터가 달리고, 나이키런처럼 거리·시속·페이스·시간을 보여준다.
 * 실제로 밖에서 달리면 속도에 맞춰 3D 캐릭터(ZenScene)가 달린다.
 */
export function OutdoorRun({
  onFinish,
  onExit,
}: {
  /** 종료 시 요약(마무리 운동 자동기록 등에 사용). */
  onFinish?: (summary: {
    durationMin: number;
    distanceKm: number;
    avgKmh: number;
  }) => void;
  /** 시작 화면 '나가기' → 모드 선택으로. */
  onExit?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [errKind, setErrKind] = useState<ErrKind>(null);
  // 종료 시 실제 기록 여부 — 이동이 거의 없으면(안 뜀) 기록하지 않는다.
  const [recorded, setRecorded] = useState(true);
  const [m, setM] = useState<Metrics>({ meters: 0, kmh: 0, elapsedSec: 0 });
  const [checkpoint, setCheckpoint] = useState<RunCheckpoint | null>(null);
  // 달리는 중 GPS 가 잠깐 끊긴 상태(터널·고가 밑) — 종료하지 않고 신호를 기다린다(2026-09-28).
  const [signalLost, setSignalLost] = useState<string | null>(null);
  // 종료 뒤 저장 상태 — 저장됨 / 기기에 보관(연결되면 자동 저장).
  const [saveState, setSaveState] = useState<RunSaveResult | "saving" | null>(null);
  // ── 2단계(2026-09-28): 카운트다운 · 일시정지 · 지금 페이스 · GPS 신호 · 캐릭터 켬/끔
  const [countdown, setCountdown] = useState<{ restored?: RunCheckpoint } | null>(null);
  const [paused, setPaused] = useState<PauseKind | null>(null);
  const [livePace, setLivePace] = useState<number | null>(null);
  const [signal, setSignal] = useState<0 | 1 | 2 | 3>(0);
  // 3D 캐릭터 — 배터리·발열 때문에 기본 끔, 켜면 기기에 기억(보고서 결정 3).
  const [showScene, setShowScene] = useState(false);
  useWakeLock(phase === "playing");

  const runRef = useRef(0); // 0..1 — ZenScene 이 매 프레임 읽어 캐릭터/풍경 구동
  const targetRef = useRef(0);
  const trackRef = useRef<RunTrack>(emptyTrack());
  const lastMoveTsRef = useRef(0);
  const startTsRef = useRef(0);
  const sessionIdRef = useRef("");
  const watchRef = useRef<GeoWatch | null>(null);
  const watchWantedRef = useRef(false); // 추적 유지 의도(async 워처 레이스 방지)
  const rafRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenDistRef = useRef<HTMLSpanElement | null>(null); // ZenScene 내부 거리(안 씀)
  const pausedAtRef = useRef<number | null>(null); // 멈춘 순간(없으면 달리는 중)
  const pauseKindRef = useRef<PauseKind | null>(null);
  const hasMovedRef = useRef(false); // 한 번이라도 움직였나(시작하자마자 자동 일시정지 안 되게)
  const reanchorRef = useRef(false); // 다시 시작 뒤 첫 위치는 거리 없이 기준점만
  const lastRawRef = useRef<GeoPoint | null>(null); // 멈춘 동안 움직임 감지용(마지막 원본 위치)
  const lastFixRef = useRef<{ acc: number | null; at: number } | null>(null);

  useEffect(() => {
    // 브라우저 저장소는 마운트 뒤에만 읽을 수 있다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckpoint(readRunCheckpoint("outdoor"));
    try {
      setShowScene(localStorage.getItem("heltch.running.scene") === "on");
    } catch {
      /* 저장소 막힘 — 기본(끔) */
    }
    // 진입 시 위치 권한 AND 위치(GPS) 켜짐을 먼저 확인 — 하나라도 아니면 진입 차단.
    checkLocation();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 위치 권한 + GPS 켜짐을 한 번에 확인(getCurrentPosition 프로브).
   * 성공해야만 intro(시작 가능). 권한거부/GPS꺼짐/못찾음이면 error 로 진입 차단.
   */
  function checkLocation() {
    setError(null);
    setErrKind(null);
    setPhase("checking");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrKind("other");
      setError("이 기기에서 위치(GPS)를 사용할 수 없어요.");
      setPhase("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setPhase("intro"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setErrKind("denied");
          setError("위치 권한이 필요해요. 권한을 허용해야 야외 런닝을 할 수 있어요.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrKind("gps-off");
          setError("위치 정보(GPS)가 꺼져 있어요. 휴대폰 설정에서 위치를 켠 뒤 다시 시도해 주세요.");
        } else {
          setErrKind("timeout");
          setError("위치를 찾지 못했어요. 위치(GPS)가 켜져 있는지 확인해 주세요.");
        }
        setPhase("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function stopAll() {
    cancelAnimationFrame(rafRef.current);
    watchWantedRef.current = false;
    watchRef.current?.stop();
    watchRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  // GPS 속도가 없어도(정지 판정) 캐릭터가 부드럽게 멈추도록 매 프레임 보간.
  function controlLoop() {
    const now = Date.now();
    // 3초 이상 이동 신호 없으면 정지로 간주 → 목표 0.
    if (now - lastMoveTsRef.current > 3000) targetRef.current = 0;
    runRef.current += (targetRef.current - runRef.current) * 0.08;
    rafRef.current = requestAnimationFrame(controlLoop);
  }

  function onFix(fix: GeoFix) {
    setSignalLost(null);
    const p = {
      lat: fix.lat,
      lng: fix.lng,
      t: fix.t,
      acc: fix.accuracy ?? 0,
    };
    lastFixRef.current = { acc: fix.accuracy ?? null, at: Date.now() };
    const raw = lastRawRef.current;
    lastRawRef.current = p;
    // GPS 드리프트로 가만히 있어도 캐릭터가 움직이던 문제 — 걷기 이상(≥3.5km/h)일 때만 이동으로 본다.
    const MOVING_KMH = 3.5;

    // 멈춘 동안 — 거리는 더하지 않는다. 자동 일시정지는 다시 움직이면 스스로 이어 간다.
    if (pausedAtRef.current !== null) {
      const rawMps = raw ? haversineMeters(raw, p) / Math.max(0.001, (p.t - raw.t) / 1000) : 0;
      const kmhNow = speedKmh(fix.speedMps != null ? fix.speedMps : rawMps);
      if (pauseKindRef.current === "auto" && kmhNow >= MOVING_KMH) resume(p);
      return;
    }

    let instMps = 0;
    if (reanchorRef.current) {
      // 다시 시작한 뒤 첫 위치 — 멈춘 사이 이동한 거리는 넣지 않고 기준점만 옮긴다.
      trackRef.current = reanchorTrack(trackRef.current, p);
      reanchorRef.current = false;
    } else {
      const res = addPoint(trackRef.current, p);
      trackRef.current = res.track;
      instMps = res.instMps;
    }
    const track = trackRef.current;
    // 기기 제공 속도(m/s) 우선, 없으면 좌표로 계산한 순간속도.
    const kmh = speedKmh(fix.speedMps != null ? fix.speedMps : instMps);
    if (kmh >= MOVING_KMH) {
      lastMoveTsRef.current = Date.now();
      hasMovedRef.current = true;
      targetRef.current = runIntensityFromSpeed(kmh);
    } else {
      targetRef.current = 0;
    }
    setLivePace(recentPaceSecPerKm(track.points, p.t));
    setM((prev) => ({ ...prev, meters: track.totalMeters, kmh }));
    persistCheckpoint(kmh);
  }

  /** 일시정지 — 시간·거리 둘 다 멈춘다. */
  function pause(kind: PauseKind) {
    if (pausedAtRef.current !== null) return;
    const now = Date.now();
    pausedAtRef.current = now;
    pauseKindRef.current = kind;
    targetRef.current = 0;
    setPaused(kind);
    // 멈춘 순간의 시간으로 바로 맞춘다(1초 틱을 기다리면 화면이 잠깐 뒤처져 보였다).
    setM((prev) => ({ ...prev, elapsedSec: activeElapsedMs(startTsRef.current, now, now) / 1000 }));
    persistCheckpoint();
  }

  /** 다시 시작 — 멈춘 시간만큼 시작을 밀고, 다음 위치부터 거리를 잰다. */
  function resume(anchor?: GeoPoint) {
    const pausedAt = pausedAtRef.current;
    if (pausedAt === null) return;
    const now = Date.now();
    startTsRef.current = resumedStart(startTsRef.current, pausedAt, now);
    pausedAtRef.current = null;
    pauseKindRef.current = null;
    lastMoveTsRef.current = now;
    if (anchor) trackRef.current = reanchorTrack(trackRef.current, anchor);
    else reanchorRef.current = true;
    setPaused(null);
  }

  function toggleScene() {
    setShowScene((on) => {
      const next = !on;
      try {
        localStorage.setItem("heltch.running.scene", next ? "on" : "off");
      } catch {
        /* 저장 못 해도 이번엔 적용 */
      }
      return next;
    });
  }

  function persistCheckpoint(kmh = m.kmh) {
    if (!sessionIdRef.current || !startTsRef.current) return;
    writeRunCheckpoint({
      ...newRunCheckpoint("outdoor", sessionIdRef.current),
      elapsedSec: activeElapsedMs(startTsRef.current, Date.now(), pausedAtRef.current) / 1000,
      distanceM: trackRef.current.totalMeters,
      speedKmh: kmh,
      route: trackRef.current.points,
      updatedAt: Date.now(),
    });
  }

  function start(restored?: RunCheckpoint) {
    setError(null);
    setErrKind(null);
    trackRef.current = restored
      ? {
          points: restored.route,
          totalMeters: restored.distanceM,
          lastMovingPoint: restored.route.at(-1) ?? null,
        }
      : emptyTrack();
    runRef.current = 0;
    targetRef.current = 0;
    startTsRef.current = Date.now() - (restored?.elapsedSec ?? 0) * 1_000;
    sessionIdRef.current = restored?.sessionId ?? crypto.randomUUID();
    lastMoveTsRef.current = Date.now();
    pausedAtRef.current = null;
    pauseKindRef.current = null;
    hasMovedRef.current = false;
    reanchorRef.current = false;
    lastRawRef.current = null;
    lastFixRef.current = null;
    setPaused(null);
    setLivePace(null);
    setSignal(0);
    setM({
      meters: restored?.distanceM ?? 0,
      kmh: restored?.speedKmh ?? 0,
      elapsedSec: restored?.elapsedSec ?? 0,
    });
    setCheckpoint(null);
    persistCheckpoint(restored?.speedKmh ?? 0);
    setPhase("playing");
    watchWantedRef.current = true;

    // 네이티브: 백그라운드에서도 유지되는 위치 추적. 웹: 포그라운드 watchPosition.
    void startGeoWatch(onFix, (kind, msg) => {
      // 🔴 달리는 중엔 **권한 거부만** 종료한다. timeout·위치 없음(터널·고가 밑)은 잠깐 끊긴
      //    것이라 신호를 기다리며 계속 감시한다 — 예전엔 15초 끊기면 달리기가 통째로 끝났다.
      //    (진입 전 GPS 꺼짐·권한은 checkLocation 이 따로 막는다.)
      if (kind !== "denied") {
        setSignalLost(
          kind === "gps-off"
            ? "위치(GPS) 신호가 없어요. 꺼져 있다면 켜 주세요 — 잡히면 이어서 기록해요."
            : "GPS 신호를 찾는 중이에요. 잡히면 이어서 기록해요.",
        );
        return;
      }
      // 권한 거부 — 계속 기록할 수 없다. 지금까지 달린 건 체크포인트에 남아 '이어하기'로 살린다.
      setErrKind(kind);
      setError(msg && /권한/.test(msg) ? msg : "위치 권한이 필요해요. 권한을 허용해 주세요.");
      setPhase("error");
      stopAll();
      // 오류 화면에서도 바로 '이어하기' — 예전엔 시작 때 비운 상태라 다시 들어와야 보였다.
      setCheckpoint(readRunCheckpoint("outdoor"));
    }).then((handle) => {
      // 종료(stopAll)가 먼저 호출됐으면 바로 정리.
      if (watchWantedRef.current) watchRef.current = handle;
      else handle.stop();
    });
    rafRef.current = requestAnimationFrame(controlLoop);
    tickRef.current = setInterval(() => {
      const now = Date.now();
      // 10초 넘게 움직임이 없으면 자동 일시정지(신호 대기·물 마시기) — 시간이 페이스에 섞이지 않게.
      if (shouldAutoPause(now, lastMoveTsRef.current, pausedAtRef.current, hasMovedRef.current)) pause("auto");
      const lastFix = lastFixRef.current;
      setSignal(gpsSignalLevel(lastFix?.acc ?? null, lastFix ? now - lastFix.at : null));
      setM((prev) => ({
        ...prev,
        elapsedSec: activeElapsedMs(startTsRef.current, now, pausedAtRef.current) / 1000,
      }));
      persistCheckpoint();
    }, 1000);
  }

  function finish() {
    stopAll();
    setSignalLost(null);
    const endedAt = Date.now();
    const meters = trackRef.current.totalMeters;
    // 달린 시간 — 멈춘 시간은 빼고. 서버엔 '끝 − 달린 시간'을 시작으로 보내 저장 시간에서도 빠지게.
    const activeMs = activeElapsedMs(startTsRef.current, endedAt, pausedAtRef.current);
    const elapsedSec = activeMs / 1000;
    pausedAtRef.current = null;
    pauseKindRef.current = null;
    setPaused(null);
    const durationMin = Math.max(1, Math.round(elapsedSec / 60));
    const distanceKm = meters / 1000;
    const avgKmh = elapsedSec > 0 ? (meters / elapsedSec) * 3.6 : 0;
    setM((prev) => ({ ...prev, elapsedSec }));
    // 실제로 달리지 않아 이동이 거의 없으면 기록하지 않는다(들어왔다 나간 경우 오기록 방지).
    if (meters < MIN_OUTDOOR_DISTANCE_M) {
      writeRunCheckpoint(null);
      setRecorded(false);
      setSaveState(null);
      setPhase("done");
      return;
    }
    setRecorded(true);
    setPhase("done");
    onFinish?.({ durationMin, distanceKm, avgKmh });
    // 저장은 한 곳(run_sessions) — 서버가 운동 시간·마무리 완료·순위 거리까지 맞춘다.
    // 기기 대기 큐에 먼저 적고 보내므로, 신호가 없어도 기록이 사라지지 않는다.
    setSaveState("saving");
    void saveFinishedRun(
      {
        clientSessionId: sessionIdRef.current,
        mode: "outdoor",
        startedAt: new Date(endedAt - activeMs).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        distanceM: meters,
        route: trackRef.current.points.map((point) => ({
          lat: point.lat,
          lng: point.lng,
          timestamp: point.t,
          accuracyM: point.acc,
        })),
      },
      `야외 런닝 ${formatDistanceKm(meters)}km`,
    ).then(setSaveState);
  }

  const pace = avgPaceSecPerKm(m.meters, m.elapsedSec);

  return (
    <div className="fixed inset-0 z-40 w-full select-none overflow-hidden bg-[#bfeaff] text-white">
      {/* 우측 상단 — 그룹 러닝 순위. 야외는 상단 HUD(거리·페이스·시간·시속)와 안 겹치게 더 아래로. */}
      {phase === "playing" ? (
        <RunLeaderboard
          getSessionMeters={() => trackRef.current.totalMeters}
          top="calc(env(safe-area-inset-top, 0px) + 10rem)"
        />
      ) : null}

      {phase === "playing" || phase === "done" ? (
        <>
          {/* 3D 캐릭터는 켰을 때만, 그리고 **달리는 중에만** 그린다 — 종료 화면에서도 60fps 로 돌던
              문제(실내는 예전에 고침)와 배터리·발열. 끄면 어두운 무대. */}
          {showScene && phase === "playing" ? (
            <>
              <ZenScene runRef={runRef} hud={{ dist: hiddenDistRef }} />
              <span ref={hiddenDistRef} className="hidden" />
            </>
          ) : (
            <div aria-hidden="true" className="absolute inset-0 bg-zinc-950" />
          )}

          {/* 나이키런 스타일 HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-1 bg-gradient-to-b from-black/45 to-transparent px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-6 text-center">
            <span className="font-mono text-6xl font-bold tabular-nums drop-shadow-lg">
              {formatDistanceKm(m.meters)}
            </span>
            <span className="text-xs font-semibold tracking-widest text-white/80">
              KM
            </span>
            <div className="mt-2 flex items-end justify-center gap-8">
              {/* 지금 페이스(최근 30초) — 누적 평균은 멈춘 시간까지 섞여 '지금'을 못 보여 줬다. */}
              <Metric label="지금 페이스" value={formatPace(livePace)} />
              <Metric label="시간" value={formatDuration(m.elapsedSec)} />
              <Metric label="평균 페이스" value={formatPace(pace)} />
            </div>
          </div>
        </>
      ) : null}

      {/* 왼쪽(지표 아래, 오른쪽 순위와 같은 높이) — GPS 신호 막대 · 캐릭터 켬/끔 */}
      {phase === "playing" ? (
        <div className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+10rem)] z-30 flex items-center gap-2">
          <span
            data-testid="gps-signal"
            data-level={signal}
            aria-label={`GPS 신호 ${["없음", "약함", "보통", "좋음"][signal]}`}
            className="flex h-11 items-end gap-0.5 rounded-full bg-black/40 px-3 pb-3"
          >
            {[1, 2, 3].map((level) => (
              <i
                key={level}
                className={`block w-1 rounded-sm ${signal >= level ? "bg-emerald-400" : "bg-white/25"}`}
                style={{ height: 4 + level * 4 }}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={toggleScene}
            aria-pressed={showScene}
            className="h-11 rounded-full bg-black/40 px-3 text-xs font-semibold text-white"
          >
            {showScene ? "캐릭터 끄기" : "캐릭터 켜기"}
          </button>
        </div>
      ) : null}

      {phase === "playing" && paused ? (
        <div
          role="status"
          data-testid="run-paused"
          data-kind={paused}
          className="absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl bg-black/70 px-4 py-5 text-center"
        >
          <p className="text-xl font-bold">{paused === "auto" ? "자동 일시정지" : "일시정지"}</p>
          <p className="mt-1 text-sm text-zinc-300">
            {paused === "auto" ? "움직이면 바로 이어서 기록해요." : "시간·거리가 멈췄어요."}
          </p>
        </div>
      ) : null}

      {phase === "playing" && signalLost ? (
        <div
          role="status"
          data-testid="gps-signal-lost"
          className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] z-20 rounded-2xl bg-black/70 px-4 py-3 text-center text-sm font-semibold text-white"
        >
          {signalLost}
        </div>
      ) : null}

      {/* 아래 — 일시정지/다시 시작 · 꾹 눌러 종료(스쳐서 끝나지 않게) */}
      {phase === "playing" ? (
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-20 flex items-start justify-center gap-10 px-6">
          <button
            type="button"
            onClick={() => (paused ? resume() : pause("manual"))}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-zinc-950 shadow-lg active:scale-95"
          >
            {paused ? "다시 시작" : "일시정지"}
          </button>
          <HoldToEnd onConfirm={finish} />
        </div>
      ) : null}

      {phase === "intro" || phase === "error" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-sky-400 to-emerald-200 px-6 text-center text-emerald-950">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 text-sm font-semibold text-emerald-950 active:scale-95"
            >
              ← 나가기
            </button>
          ) : null}
          <h1 className="text-3xl font-bold drop-shadow-sm">야외 런닝 📍</h1>
          <p className="max-w-xs text-sm font-medium leading-6">
            밖에서 <b>실제로 달리면</b> GPS로 거리·시속·페이스가 기록되고, 속도에
            맞춰 캐릭터가 함께 달려요. 끝나면 오늘 마무리 운동으로 기록됩니다.
          </p>
          <p className="max-w-xs rounded-lg bg-emerald-900/10 px-3 py-2 text-xs font-semibold text-emerald-900">
            ⚠ 위치(GPS) 권한을 허용해야 작동해요. 시작을 누르면 권한을 요청하고,
            거부하면 야외 런닝이 실행되지 않아요.
          </p>
          {error ? (
            <p className="max-w-xs rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-800">
              {error}
            </p>
          ) : null}

          {checkpoint ? (
            <div className="w-full max-w-xs rounded-xl bg-white/80 p-4 text-left shadow">
              <p className="font-bold text-emerald-950">중단된 야외 런닝이 있어요</p>
              <p className="mt-1 text-xs text-emerald-800">
                {formatDuration(checkpoint.elapsedSec)} · {formatDistanceKm(checkpoint.distanceM)}km
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setCountdown({ restored: checkpoint })} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">이어하기</button>
                <button type="button" onClick={() => { writeRunCheckpoint(null); setCheckpoint(null); }} className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700">삭제</button>
              </div>
            </div>
          ) : null}

          {/* GPS 꺼짐/타임아웃이면 '위치 설정 열기'(네이티브 앱) — 웹이면 안내로 폴백. */}
          {phase === "error" && (errKind === "gps-off" || errKind === "timeout") ? (
            <button
              type="button"
              onClick={() => {
                if (!openLocationSettings()) {
                  setError(
                    "휴대폰 설정 → 위치(위치 정보)를 켠 뒤 다시 시도해 주세요.",
                  );
                }
              }}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-emerald-800 shadow active:scale-95"
            >
              위치 설정 열기
            </button>
          ) : null}

          <button
            type="button"
            onClick={phase === "error" ? checkLocation : () => setCountdown({})}
            className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition active:scale-95"
          >
            {phase === "error" ? "다시 확인" : "시작하기"}
          </button>
        </div>
      ) : null}

      {/* 시작 전 3초 — 이어하기도 같다. 끝나면 실제로 시작(시간은 그때부터). */}
      {countdown ? (
        <RunCountdown
          onDone={() => {
            const restored = countdown.restored;
            setCountdown(null);
            start(restored);
          }}
        />
      ) : null}

      {/* 진입 시 위치 확인 중 */}
      {phase === "checking" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-sky-400 to-emerald-200 px-6 text-center text-emerald-950">
          <Loader2 aria-hidden="true" size={30} className="animate-spin" />
          <p className="text-sm font-semibold">위치 확인 중…</p>
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-center">
          <h2 className="text-2xl font-bold">
            {recorded ? "런닝 완료 🏁" : "런닝 종료"}
          </h2>
          {/* 종료 화면의 '기록 요약'(거리·시간·페이스, 기록됨 안내)은 표시하지 않는다 — 런닝
              기록은 헬스탭 운동목록·캘린더·기록에서 확인. 단, '기록 안 됨' 경고는 남겨 사용자가
              저장 안 된 걸 알 수 있게 한다. (사용자 요청: 런닝모드 종료화면의 기록 요약만 제거) */}
          {!recorded ? (
            <p className="text-sm text-zinc-300">
              이동이 거의 없어 기록하지 않았어요.
            </p>
          ) : null}
          {/* 저장 상태 한 줄 — 요약은 넣지 않는다(사용자 요청). 기록이 사라지지 않았다는 확인만. */}
          {recorded && runSaveMessage(saveState) ? (
            <p role="status" data-testid="run-save-state" data-state={saveState ?? ""} className="text-sm text-zinc-200">
              {runSaveMessage(saveState)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setPhase("intro")}
            className="rounded-full bg-emerald-500 px-8 py-3 text-lg font-bold text-white active:scale-95"
          >
            확인
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-2xl font-bold tabular-nums drop-shadow">
        {value}
        {unit ? <span className="ml-0.5 text-xs font-semibold">{unit}</span> : null}
      </span>
      <span className="text-xs font-semibold tracking-wide text-white/75">
        {label}
      </span>
    </div>
  );
}
