"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  addPoint,
  avgPaceSecPerKm,
  emptyTrack,
  formatDistanceKm,
  formatDuration,
  formatPace,
  runIntensityFromSpeed,
  speedKmh,
  type RunTrack,
} from "@/features/running/geo";
import { recordRunAsCooldownAction } from "@/features/running/run-record-actions";
import { openLocationSettings } from "@/features/running/native";

// 무거운 3D 씬은 '시작' 이후에만 지연 로드(첫 진입 번들 가볍게 — PWA 안전).
const ZenScene = dynamic(() => import("@/features/running/zen-scene"), {
  ssr: false,
  loading: () => null,
});

type Phase = "intro" | "playing" | "done" | "error";
type Metrics = { meters: number; kmh: number; elapsedSec: number };
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
  const [m, setM] = useState<Metrics>({ meters: 0, kmh: 0, elapsedSec: 0 });

  const runRef = useRef(0); // 0..1 — ZenScene 이 매 프레임 읽어 캐릭터/풍경 구동
  const targetRef = useRef(0);
  const trackRef = useRef<RunTrack>(emptyTrack());
  const lastMoveTsRef = useRef(0);
  const startTsRef = useRef(0);
  const watchRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenDistRef = useRef<HTMLSpanElement | null>(null); // ZenScene 내부 거리(안 씀)

  useEffect(() => {
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAll() {
    cancelAnimationFrame(rafRef.current);
    if (watchRef.current != null && typeof navigator !== "undefined") {
      navigator.geolocation?.clearWatch(watchRef.current);
      watchRef.current = null;
    }
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

  function onPosition(pos: GeolocationPosition) {
    const c = pos.coords;
    const p = {
      lat: c.latitude,
      lng: c.longitude,
      t: pos.timestamp,
      acc: c.accuracy,
    };
    const { track, instMps } = addPoint(trackRef.current, p);
    trackRef.current = track;
    // 기기 제공 속도(m/s) 우선, 없으면 좌표로 계산한 순간속도.
    const mps =
      typeof c.speed === "number" && c.speed >= 0 ? c.speed : instMps;
    const kmh = speedKmh(mps);
    // GPS 드리프트로 가만히 있어도 캐릭터가 움직이던 문제 — 걷기 이상(≥3.5km/h)일 때만
    // 이동으로 본다. 그 이하는 정지(target 0) → 캐릭터도 멈춤.
    const MOVING_KMH = 3.5;
    if (kmh >= MOVING_KMH) {
      lastMoveTsRef.current = Date.now();
      targetRef.current = runIntensityFromSpeed(kmh);
    } else {
      targetRef.current = 0;
    }
    setM((prev) => ({ ...prev, meters: track.totalMeters, kmh }));
  }

  function start() {
    setError(null);
    setErrKind(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("이 기기에서 위치(GPS)를 사용할 수 없어요.");
      setErrKind("other");
      setPhase("error");
      return;
    }
    trackRef.current = emptyTrack();
    runRef.current = 0;
    targetRef.current = 0;
    startTsRef.current = Date.now();
    lastMoveTsRef.current = Date.now();
    setM({ meters: 0, kmh: 0, elapsedSec: 0 });
    setPhase("playing");

    watchRef.current = navigator.geolocation.watchPosition(
      onPosition,
      (err) => {
        // 권한거부 / 위치정보(GPS) 꺼짐(POSITION_UNAVAILABLE) / 신호 타임아웃을 구분해 안내.
        if (err.code === err.PERMISSION_DENIED) {
          setErrKind("denied");
          setError("위치 권한이 필요해요. 권한을 허용해 주세요.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrKind("gps-off");
          setError("위치 정보(GPS)가 꺼져 있어요. 휴대폰 설정에서 위치를 켜주세요.");
        } else if (err.code === err.TIMEOUT) {
          setErrKind("timeout");
          setError("위치를 찾지 못했어요. 실외에서 GPS가 켜져 있는지 확인해 주세요.");
        } else {
          setErrKind("other");
          setError(`위치 오류: ${err.message}`);
        }
        setPhase("error");
        stopAll();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    rafRef.current = requestAnimationFrame(controlLoop);
    tickRef.current = setInterval(() => {
      setM((prev) => ({
        ...prev,
        elapsedSec: (Date.now() - startTsRef.current) / 1000,
      }));
    }, 1000);
  }

  function finish() {
    stopAll();
    const meters = trackRef.current.totalMeters;
    const elapsedSec = (Date.now() - startTsRef.current) / 1000;
    const durationMin = Math.max(1, Math.round(elapsedSec / 60));
    const distanceKm = meters / 1000;
    const avgKmh = elapsedSec > 0 ? (meters / elapsedSec) * 3.6 : 0;
    setM((prev) => ({ ...prev, elapsedSec }));
    setPhase("done");
    onFinish?.({ durationMin, distanceKm, avgKmh });
    // 오늘 마무리 운동에 자동 기록(실패해도 화면엔 영향 없음).
    void recordRunAsCooldownAction({ durationMin, distanceKm, avgKmh }).catch(
      () => {},
    );
  }

  const pace = avgPaceSecPerKm(m.meters, m.elapsedSec);

  return (
    <div className="fixed inset-0 z-40 w-full select-none overflow-hidden bg-[#bfeaff] text-white">
      {phase === "playing" || phase === "done" ? (
        <>
          <ZenScene runRef={runRef} hud={{ dist: hiddenDistRef }} />
          <span ref={hiddenDistRef} className="hidden" />

          {/* 나이키런 스타일 HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-1 bg-gradient-to-b from-black/45 to-transparent px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-6 text-center">
            <span className="font-mono text-6xl font-black tabular-nums drop-shadow-lg">
              {formatDistanceKm(m.meters)}
            </span>
            <span className="text-xs font-semibold tracking-widest text-white/80">
              KM
            </span>
            <div className="mt-2 flex items-end justify-center gap-8">
              <Metric label="페이스" value={formatPace(pace)} />
              <Metric label="시간" value={formatDuration(m.elapsedSec)} />
              <Metric label="시속" value={`${m.kmh.toFixed(1)}`} unit="km/h" />
            </div>
          </div>
        </>
      ) : null}

      {phase === "playing" ? (
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] z-20 flex justify-center px-6">
          <button
            type="button"
            onClick={finish}
            className="rounded-full bg-red-500 px-10 py-4 text-lg font-bold text-white shadow-lg active:scale-95"
          >
            종료
          </button>
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
          <h1 className="text-3xl font-extrabold drop-shadow-sm">야외 런닝 📍</h1>
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
            onClick={start}
            className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition active:scale-95"
          >
            {phase === "error" ? "다시 시도" : "시작하기"}
          </button>
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-center">
          <h2 className="text-2xl font-extrabold">런닝 완료 🏁</h2>
          <p className="text-lg">
            거리 <b className="text-emerald-400">{formatDistanceKm(m.meters)}km</b>
            {" · "}시간 <b>{formatDuration(m.elapsedSec)}</b>
            {" · "}페이스 <b>{formatPace(pace)}</b>
          </p>
          <p className="text-sm text-zinc-300">오늘 마무리 운동에 기록했어요.</p>
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
      <span className="font-mono text-2xl font-black tabular-nums drop-shadow">
        {value}
        {unit ? <span className="ml-0.5 text-xs font-semibold">{unit}</span> : null}
      </span>
      <span className="text-[11px] font-semibold tracking-wide text-white/75">
        {label}
      </span>
    </div>
  );
}
