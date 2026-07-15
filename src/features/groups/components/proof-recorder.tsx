"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, RefreshCw, SwitchCamera, X } from "lucide-react";

import { uploadGroupProof } from "@/features/groups/upload-proof";
import { setGroupProofAction } from "@/features/groups/proof-actions";

const CLIP_MS = 3000;

/** 이 브라우저에서 녹화 가능한 mime + 확장자. 없으면 null(파일 촬영 폴백). */
function pickMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const cands: { mime: string; ext: string }[] = [
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
    { mime: "video/mp4", ext: "mp4" },
  ];
  for (const c of cands) {
    try {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

type Phase = "live" | "recording" | "preview" | "saving";

/**
 * 오늘 운동 인증 움짤 녹화 오버레이 — 카메라로 3초 무음영상을 찍고 업로드한다.
 * MediaRecorder 미지원 기기는 네이티브 카메라(파일 촬영)로 폴백.
 */
export function ProofRecorder({
  groupId,
  onClose,
}: {
  groupId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [phase, setPhase] = useState<Phase>("live");
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<{ blob: Blob; ext: string; url: string } | null>(
    null,
  );
  const canRecord = pickMime() !== null;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // 카메라 시작(라이브 프리뷰). facing 바뀌면 재시작.
  useEffect(() => {
    if (phase !== "live") return;
    let cancelled = false;
    (async () => {
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          setError("카메라를 열 수 없어요. 권한을 확인하거나 아래로 촬영하세요.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facing, phase, stopStream]);

  // 언마운트 정리.
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopStream();
      if (clip) URL.revokeObjectURL(clip.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRecording() {
    const picked = pickMime();
    const stream = streamRef.current;
    if (!picked || !stream) return;
    setError(null);
    chunksRef.current = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: picked.mime });
    } catch {
      setError("녹화를 시작할 수 없어요.");
      return;
    }
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: picked.mime });
      const url = URL.createObjectURL(blob);
      setClip({ blob, ext: picked.ext, url });
      setPhase("preview");
      stopStream();
    };
    rec.start();
    setPhase("recording");
    setCount(Math.round(CLIP_MS / 1000));
    const started = Date.now();
    const tick = setInterval(() => {
      const left = Math.ceil((CLIP_MS - (Date.now() - started)) / 1000);
      setCount(Math.max(0, left));
      if (left <= 0) clearInterval(tick);
    }, 200);
    stopTimerRef.current = setTimeout(() => {
      clearInterval(tick);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    }, CLIP_MS);
  }

  // 파일 촬영 폴백(네이티브 카메라) — MediaRecorder 미지원 기기.
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = (f.name.split(".").pop() || "mp4").toLowerCase();
    const url = URL.createObjectURL(f);
    setClip({ blob: f, ext, url });
    setPhase("preview");
    stopStream();
  }

  function retake() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setError(null);
    setPhase("live");
  }

  async function save() {
    if (!clip) return;
    setPhase("saving");
    setError(null);
    try {
      const { url, mediaType } = await uploadGroupProof(clip.blob, clip.ext);
      const res = await setGroupProofAction(groupId, url, mediaType);
      if (!res.ok) {
        setError(res.error);
        setPhase("preview");
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했어요.");
      setPhase("preview");
    }
  }

  const mirror = facing === "user";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* 상단 바 */}
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="rounded-full bg-white/10 p-2 text-white active:scale-95"
        >
          <X size={22} />
        </button>
        <p className="text-sm font-bold text-white">오늘 운동 인증 · 3초</p>
        {phase === "live" && canRecord ? (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            aria-label="카메라 전환"
            className="rounded-full bg-white/10 p-2 text-white active:scale-95"
          >
            <SwitchCamera size={22} />
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      {/* 뷰포트 */}
      <div className="relative flex-1 overflow-hidden">
        {phase === "preview" || phase === "saving" ? (
          <video
            ref={previewRef}
            src={clip?.url}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
            style={mirror ? { transform: "scaleX(-1)" } : undefined}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
            style={mirror ? { transform: "scaleX(-1)" } : undefined}
          />
        )}

        {phase === "recording" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-red-600/90 px-4 py-1.5 text-2xl font-black tabular-nums text-white shadow-lg">
              ● {count}
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-red-600/90 p-3 text-center text-sm font-semibold text-white">
            {error}
          </div>
        ) : null}
      </div>

      {/* 하단 컨트롤 */}
      <div className="flex items-center justify-center gap-6 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {phase === "live" ? (
          canRecord ? (
            <button
              type="button"
              onClick={startRecording}
              aria-label="3초 녹화"
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-red-600 text-white shadow-xl active:scale-95"
            >
              <Camera size={30} />
            </button>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white active:scale-95">
              <Camera size={18} /> 카메라로 촬영
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={onPickFile}
                className="hidden"
              />
            </label>
          )
        ) : null}

        {phase === "recording" ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <Loader2 size={18} className="animate-spin" /> 녹화 중…
          </div>
        ) : null}

        {phase === "preview" ? (
          <>
            <button
              type="button"
              onClick={retake}
              className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-bold text-white active:scale-95"
            >
              <RefreshCw size={18} /> 다시
            </button>
            <button
              type="button"
              onClick={save}
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-bold text-white active:scale-95"
            >
              인증 올리기
            </button>
          </>
        ) : null}

        {phase === "saving" ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Loader2 size={18} className="animate-spin" /> 올리는 중…
          </div>
        ) : null}
      </div>
    </div>
  );
}