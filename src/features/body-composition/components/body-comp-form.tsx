"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  saveBodyCompositionAction,
  type SaveBodyCompInput,
} from "@/features/body-composition/actions";

const BUCKET = "body-composition-images";

type FieldKey = Exclude<keyof SaveBodyCompInput, "consented" | "measuredAt" | "imagePath">;

const SECTIONS: { label: string; fields: { key: FieldKey; label: string; unit: string }[] }[] = [
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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
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
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-zinc-950">
          체성분 분석지 등록
        </h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          체성분 분석지(예: 가까운 헬스장의 체성분 측정 결과지)를 보고 아래
          항목을 입력하세요. 사진은 선택입니다. 입력값은 가까운 부위별 밸런스
          분석과 추천 루틴 기반으로만 사용되며 의학적 진단을 제공하지
          않습니다.
        </p>

        <label className="mt-4 block space-y-1">
          <span className="text-sm font-semibold text-zinc-700">측정일</span>
          <input
            type="date"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </section>

      {SECTIONS.map((sec) => (
        <section
          key={sec.label}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-3 text-sm font-bold text-zinc-950">{sec.label}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sec.fields.map((f) => (
              <label key={f.key} className="space-y-1">
                <span className="text-xs font-semibold text-zinc-700">
                  {f.label} ({f.unit})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={values[f.key]}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-bold text-zinc-950">
          분석지 사진 (선택)
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          본인만 볼 수 있게 비공개 저장됩니다(개인 폴더). 최대 10MB · PNG/JPG/WEBP.
        </p>
        <label
          className={cn(
            "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50",
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
        {imagePath ? (
          <p className="mt-2 text-xs text-emerald-700">
            업로드 완료 · {imagePath.split("/").pop()}
          </p>
        ) : hasExistingImage ? (
          <p className="mt-2 text-xs text-zinc-500">이전 분석지 사진이 등록돼 있어요.</p>
        ) : null}
        {uploadErr ? (
          <p className="mt-2 text-xs text-red-600">{uploadErr}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-zinc-700">
        <p className="font-semibold text-amber-800">
          민감정보(건강) 수집·이용 동의
        </p>
        <ul className="mt-1 list-disc pl-5 text-[11px] text-zinc-600">
          <li>수집 항목: 측정일, 체중, 골격근량, 체지방률·량, 부위별 근육·지방 수치, 분석지 사진</li>
          <li>이용 목적: 부위별 밸런스 시각화 및 운동 루틴 추천에 한정</li>
          <li>보관: 본인 계정에 비공개로 저장(본인만 조회 가능), 언제든 삭제 가능</li>
          <li>제3자 제공·의학적 진단·치료 권유에 사용하지 않음</li>
        </ul>
        <label className="mt-3 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          <span className="text-xs font-semibold text-zinc-800">
            위 사항에 동의합니다 (필수)
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !consented}
          onClick={submit}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : null}
          체성분 저장
        </button>
        {msg ? (
          <span
            className={`text-sm font-medium ${
              msg.ok ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
