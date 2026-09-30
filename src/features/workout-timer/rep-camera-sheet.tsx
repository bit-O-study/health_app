"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

import { useBackClose } from "@/lib/platform/use-back-close";
import { speak } from "@/features/workout-timer/speech";
import {
  INITIAL_REP_STATE,
  REP_SPECS,
  angleFromPose,
  repStatusText,
  repsToApply,
  stepRep,
  type PosePoint,
  type RepKind,
  type RepState,
} from "@/features/workout-timer/rep-counter";

/*
 * MediaPipe(tasks-vision) — 실내 런닝과 같은 버전·같은 방식(CDN ESM, 번들러가 못 보게 native import).
 * 몸 전체 인식(PoseLandmarker)은 가벼운 lite 모델을 쓴다(약 5MB, 처음 한 번 받는다).
 */
const VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const nativeImport = new Function("u", "return import(u)") as (
  u: string,
) => Promise<Record<string, unknown>>;

/** 인식 간격(ms) — 15Hz. 스쿼트·푸시업 한 번은 1초 넘게 걸려 충분하고, 폰 발열을 줄인다. */
const DETECT_INTERVAL_MS = 66;

type PoseLandmarker = {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { landmarks?: PosePoint[][] };
  close?: () => void;
};

type Phase = "starting" | "ready" | "error";

/**
 * 카메라로 횟수 세기 — 운동 모드에서 연다(2026-09-30).
 *
 * 영상은 **폰 밖으로 나가지 않는다**(인식은 기기 안에서). 끝내면 센 횟수를 `onApply` 로
 * 넘기고, 운동 모드가 횟수 칸에 넣는다 — 사용자는 거기서 확인하고 고칠 수 있다.
 */
export function RepCameraSheet({
  kind,
  exerciseName,
  voiceOn,
  onApply,
  onClose,
}: {
  kind: RepKind;
  exerciseName: string;
  voiceOn: boolean;
  onApply: (reps: number) => void;
  onClose: () => void;
}) {
  const spec = REP_SPECS[kind];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef(0);
  const lastDetectRef = useRef(0);
  const aliveRef = useRef(true);
  const stateRef = useRef<RepState>(INITIAL_REP_STATE);
  const voiceRef = useRef(voiceOn);
  const [state, setState] = useState<RepState>(INITIAL_REP_STATE);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);

  useBackClose(true, onClose);

  useEffect(() => {
    voiceRef.current = voiceOn;
  }, [voiceOn]);

  /** 장면 하나의 각도를 반영한다(카메라·테스트 공통 입구). */
  const feed = useCallback(
    (angle: number | null) => {
      const r = stepRep(stateRef.current, angle, spec);
      const prev = stateRef.current;
      stateRef.current = r.state;
      if (r.counted && voiceRef.current) speak(String(r.state.count));
      // 매 장면 setState 하면 15Hz 로 다시 그린다 — 화면에 보이는 값이 바뀔 때만.
      if (
        r.counted ||
        prev.visible !== r.state.visible ||
        prev.phase !== r.state.phase
      ) {
        setState(r.state);
      }
    },
    [spec],
  );

  useEffect(() => {
    aliveRef.current = true;

    /** 인식 루프 — 15Hz 로 솎아 한 장면씩 `feed` 에 넣는다. */
    function loop(ts: number) {
      if (!aliveRef.current) return;
      const v = videoRef.current;
      const lm = landmarkerRef.current;
      if (v && lm && v.readyState >= 2 && ts - lastDetectRef.current >= DETECT_INTERVAL_MS) {
        lastDetectRef.current = ts;
        try {
          const res = lm.detectForVideo(v, ts);
          feed(angleFromPose(res.landmarks?.[0], spec));
        } catch {
          /* 한 장면 인식 실패는 건너뛴다 */
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    // 테스트 전용 입구 — 실제 카메라를 못 쓰는 E2E 에서 각도를 직접 넣는다. 배포 빌드엔 없다.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __jimkkunRepFeed?: (a: number | null) => void }).__jimkkunRepFeed = feed;
    }

    (async () => {
      try {
        // 카메라 먼저 — 권한이 없으면 모델(수 MB)을 받을 이유가 없다.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (!aliveRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});

        const vision = (await nativeImport(VISION_URL)) as unknown as {
          FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
          PoseLandmarker: { createFromOptions: (f: unknown, o: unknown) => Promise<unknown> };
        };
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        const make = (delegate: "GPU" | "CPU") =>
          vision.PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        // 그래픽 가속이 안 되는 폰은 CPU 로 — 느리지만 동작은 한다.
        const lm = (await make("GPU").catch(() => make("CPU"))) as PoseLandmarker;
        if (!aliveRef.current) {
          lm.close?.();
          return;
        }
        landmarkerRef.current = lm;
        setPhase("ready");
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        if (!aliveRef.current) return;
        const name = (e as { name?: string } | null)?.name;
        setError(
          name === "NotAllowedError"
            ? "카메라 권한이 없어요. 설정에서 카메라를 허용해 주세요."
            : "카메라나 인식 도구를 열지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.",
        );
        setPhase("error");
      }
    })();

    return () => {
      // 🔴 해제하지 않으면 재진입마다 WASM·GPU 메모리가 쌓여 앱이 튕긴다(실내 런닝에서 겪음).
      aliveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as { __jimkkunRepFeed?: unknown }).__jimkkunRepFeed;
      }
    };
  }, [feed, spec]);

  const reps = repsToApply(state.count);
  const status =
    phase === "error"
      ? error
      : phase === "starting"
        ? "카메라와 인식 도구를 준비하고 있어요…"
        : repStatusText(state, spec);

  return (
    <div
      className="dark fixed inset-0 z-[80] flex flex-col bg-zinc-950 text-zinc-100"
      role="dialog"
      aria-modal="true"
      aria-label={`${exerciseName} 카메라로 세기`}
      data-testid="rep-camera-sheet"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <h3 className="flex items-center gap-1.5 text-base font-bold">
          <Camera aria-hidden="true" size={18} />
          {exerciseName} 카메라로 세기
        </h3>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-2xl bg-zinc-900">
        {/* 거울처럼 보이게 좌우 반전 — 앞 카메라라 그래야 자연스럽다. 인식에는 영향 없다. */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-6">
          <span
            className="text-7xl font-bold tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            data-testid="rep-camera-count"
            aria-live="polite"
          >
            {state.count}
          </span>
          <span className="text-sm font-semibold text-zinc-200">회</span>
        </div>
      </div>

      <p
        className="mx-4 mt-3 min-h-[2.75rem] text-center text-sm text-zinc-300"
        data-testid="rep-camera-status"
      >
        {status}
      </p>

      <div className="flex flex-col gap-2 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2">
        <button
          type="button"
          disabled={reps === null}
          onClick={() => {
            if (reps !== null) onApply(reps);
          }}
          className="app-press h-12 rounded-full bg-brand text-base font-semibold text-zinc-950 disabled:opacity-40"
        >
          {reps === null ? "아직 센 횟수가 없어요" : `끝내고 ${reps}회 넣기`}
        </button>
        <p className="text-center text-xs text-zinc-500">
          영상은 폰 안에서만 쓰고 저장하거나 보내지 않아요. 덜 내려간 동작은 세지 않아요.
        </p>
      </div>
    </div>
  );
}
