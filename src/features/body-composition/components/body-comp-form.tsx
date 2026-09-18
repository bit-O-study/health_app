"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resizeImageForAI } from "@/lib/image/resize-for-ai";
import {
  saveBodyCompositionAction,
  type SaveBodyCompInput,
} from "@/features/body-composition/actions";
import { scanBodyCompPhotoAction } from "@/features/body-composition/body-comp-scan-actions";

const BUCKET = "body-composition-images";

type FieldKey = Exclude<
  keyof SaveBodyCompInput,
  "consented" | "measuredAt" | "imagePath"
>;

const SECTIONS: {
  label: string;
  fields: { key: FieldKey; label: string; unit: string }[];
}[] = [
  {
    label: "기본",
    fields: [
      { key: "weightKg", label: "체중", unit: "kg" },
      { key: "skeletalMuscleKg", label: "골격근량", unit: "kg" },
      { key: "bodyFatKg", label: "체지방량", unit: "kg" },
      { key: "bodyFatPct", label: "체지방률", unit: "%" },
    ],
  },
  {
    label: "부위별 근육량",
    fields: [
      { key: "muscleRightArm", label: "우상지", unit: "kg" },
      { key: "muscleLeftArm", label: "좌상지", unit: "kg" },
      { key: "muscleTrunk", label: "체간", unit: "kg" },
      { key: "muscleRightLeg", label: "우하지", unit: "kg" },
      { key: "muscleLeftLeg", label: "좌하지", unit: "kg" },
    ],
  },
  {
    label: "부위별 체지방",
    fields: [
      { key: "fatRightArm", label: "우상지", unit: "kg" },
      { key: "fatLeftArm", label: "좌상지", unit: "kg" },
      { key: "fatTrunk", label: "체간", unit: "kg" },
      { key: "fatRightLeg", label: "우하지", unit: "kg" },
      { key: "fatLeftLeg", label: "좌하지", unit: "kg" },
    ],
  },
];

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BodyCompForm({
  hasExistingImage,
}: {
  hasExistingImage: boolean;
}) {
  const router = useRouter();
  const [measuredAt, setMeasuredAt] = useState(todayYmd());
  const [values, setValues] = useState<Record<FieldKey, string>>(() => {
    const obj = {} as Record<FieldKey, string>;
    for (const s of SECTIONS) for (const f of s.fields) obj[f.key] = "";
    return obj;
  });
  const [consented, setConsented] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 클라이언트 OCR (tesseract.js) — 사진은 브라우저 안에서만 처리, 어디로도 안 나감
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrPhase, setOcrPhase] = useState<string>("");
  const [ocrMsg, setOcrMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    setImageFile(file); // OCR 용 원본 파일 보존
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUploadErr("로그인이 필요합니다.");
        return;
      }
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setUploadErr(error.message);
        return;
      }
      setImagePath(path);
    } finally {
      setUploading(false);
    }
  }

  async function runOcr() {
    if (!imageFile) {
      setOcrMsg({ ok: false, text: "먼저 사진을 선택해 주세요." });
      return;
    }
    setOcrMsg(null);
    setOcrRunning(true);
    setOcrProgress(0);
    setOcrPhase("AI가 분석 중…");
    try {
      // 사진을 AI 비전 크기로 축소 후 서버에서 판독(식단 스캔과 동일 경로).
      const img = await resizeImageForAI(imageFile);
      const res = await scanBodyCompPhotoAction({
        imageBase64: img.base64,
        mediaType: img.mediaType,
      });
      if (!res.ok) {
        setOcrMsg({ ok: false, text: res.error });
        return;
      }

      const parsed = res.values;
      const filled: string[] = [];
      setValues((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(parsed)) {
          if (v === undefined) continue;
          next[k as FieldKey] = String(v);
          filled.push(k);
        }
        return next;
      });
      setOcrMsg(
        filled.length > 0
          ? {
              ok: true,
              text: `${filled.length}개 항목을 읽어 채웠습니다. 값을 확인하고 ‘체성분 저장’을 눌러주세요.`,
            }
          : {
              ok: false,
              text: "분석지에서 수치를 인식하지 못했습니다. 더 선명한 사진으로 다시 시도하거나 직접 입력해 주세요.",
            },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOcrMsg({
        ok: false,
        text: `분석 실패: ${msg}. 다시 시도하거나 직접 입력해 주세요.`,
      });
    } finally {
      setOcrRunning(false);
      setOcrProgress(0);
      setOcrPhase("");
    }
  }

  function parse(k: FieldKey): number | null {
    const s = values[k].trim();
    return s === "" ? null : Number(s);
  }

  function submit() {
    if (!consented) {
      setMsg({
        ok: false,
        text: "민감정보(건강정보) 수집·이용 동의가 필요합니다.",
      });
      return;
    }
    start(async () => {
      const input: SaveBodyCompInput = {
        measuredAt,
        consented: true,
        imagePath,
        weightKg: parse("weightKg"),
        skeletalMuscleKg: parse("skeletalMuscleKg"),
        bodyFatKg: parse("bodyFatKg"),
        bodyFatPct: parse("bodyFatPct"),
        muscleRightArm: parse("muscleRightArm"),
        muscleLeftArm: parse("muscleLeftArm"),
        muscleTrunk: parse("muscleTrunk"),
        muscleRightLeg: parse("muscleRightLeg"),
        muscleLeftLeg: parse("muscleLeftLeg"),
        fatRightArm: parse("fatRightArm"),
        fatLeftArm: parse("fatLeftArm"),
        fatTrunk: parse("fatTrunk"),
        fatRightLeg: parse("fatRightLeg"),
        fatLeftLeg: parse("fatLeftLeg"),
      };
      const res = await saveBodyCompositionAction(input);
      setMsg(
        res.ok
          ? { ok: true, text: "저장됐습니다. 부위별 밸런스에 즉시 반영돼요." }
          : { ok: false, text: res.error },
      );
      if (res.ok) router.refresh();
    });
  }

  return (
    // 촘촘한 폼(2026-09-16 8단계) — 섹션 라벨은 카드 밖, 입력칸은 폰에서도 두 칸씩.
    <div className="space-y-4">
      <section>
        <h2 className="app-section-label">체성분 분석지 등록</h2>
        <label className="app-card block space-y-1 p-3">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            측정일
          </span>
          <input
            type="date"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            className="h-10 w-full rounded-[10px] bg-zinc-100 px-3 text-base tabular-nums outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
          />
        </label>
      </section>

      {SECTIONS.map((sec) => (
        <section key={sec.label}>
          <h3 className="app-section-label">{sec.label}</h3>
          <div className="app-card grid grid-cols-2 gap-x-2 gap-y-2.5 p-3 sm:grid-cols-3">
            {sec.fields.map((f) => (
              <label key={f.key} className="min-w-0 space-y-1">
                <span className="block truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {f.label} ({f.unit})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={values[f.key]}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  className="h-10 w-full rounded-[10px] bg-zinc-100 px-3 text-base tabular-nums outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h3 className="app-section-label">분석지 사진 + 자동 추출</h3>
        <div className="app-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "app-press inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-100 px-3.5 text-sm font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200",
              uploading && "opacity-60",
            )}
          >
            {uploading ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Upload aria-hidden="true" size={15} />
            )}
            {uploading ? "업로드 중..." : "사진 선택"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={onFile}
            />
          </label>

          <button
            type="button"
            disabled={ocrRunning || !imageFile}
            onClick={runOcr}
            className="app-press inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-3.5 text-sm font-semibold text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ocrRunning ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Sparkles aria-hidden="true" size={15} />
            )}
            사진에서 자동 추출
          </button>
        </div>

        {ocrRunning ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {ocrPhase}
              {ocrProgress > 0 ? ` ${ocrProgress}%` : ""}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              첫 실행은 30초쯤 걸려요.
            </p>
          </div>
        ) : null}

        {imagePath ? (
          <p className="mt-2 text-xs text-brand">
            업로드 완료 · {imagePath.split("/").pop()}
          </p>
        ) : hasExistingImage ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            이전 분석지 사진이 등록돼 있어요.
          </p>
        ) : null}
        {uploadErr ? (
          <p className="mt-2 text-xs text-danger">
            {uploadErr}
          </p>
        ) : null}
        {ocrMsg ? (
          <p
            className={cn(
              "mt-2 text-xs",
              ocrMsg.ok
                ? "text-brand"
                : "text-danger",
            )}
          >
            {ocrMsg.text}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          사진은 기기 안에서 읽고 비공개로 저장돼요 · 최대 10MB
        </p>
        </div>
      </section>

      <section className="app-card p-3 text-xs leading-5 text-zinc-700 dark:text-zinc-300">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          민감정보(건강) 수집·이용 동의
        </p>
        <ul className="mt-1 list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-400">
          <li>
            수집 항목: 측정일, 체중, 골격근량, 체지방률·량, 부위별 근육·지방
            수치, 분석지 사진
          </li>
          <li>이용 목적: 부위별 밸런스 시각화 및 운동 루틴 추천에 한정</li>
          <li>
            보관: 본인 계정에 비공개로 저장(본인만 조회 가능), 언제든 삭제 가능
          </li>
          <li>제3자 제공·의학적 진단·치료 권유에 사용하지 않음</li>
          <li>
            ‘사진에서 자동 추출’ 은 브라우저 안에서만 처리되며 사진이 외부
            서버로 전송되지 않습니다.
          </li>
        </ul>
        <label className="mt-3 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            위 사항에 동의합니다 (필수)
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !consented}
          onClick={submit}
          className="app-press inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-base font-semibold text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : null}
          체성분 저장
        </button>
        {msg ? (
          <span
            className={`text-sm font-medium ${
              msg.ok
                ? "text-brand"
                : "text-danger"
            }`}
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
