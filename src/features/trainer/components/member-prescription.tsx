"use client";

import { Search, ChevronDown, Dumbbell } from "lucide-react";
import { useState, useTransition } from "react";
import { DAY_BLOCKS, isDayBlockId } from "@/features/routine/data";
import { useRouter } from "next/navigation";
import { EQUIPMENT_LABELS, type EquipmentId } from "@/features/routine/exercise-catalog-labels";
import { prescribeMemberExercise, prescribeMemberToday, searchPrescriptionExercises } from "../prescription-actions";
import { groupTodayRowsByFocus, type MemberExercise, type PrescriptionInput, type TodayPlanRow } from "../member-report";

export type PrescriptionRow = MemberExercise & { name: string; equipments: EquipmentId[]; dayLabel: string };
/** 오늘 운동 한 줄 + 화면에 쓸 이름/기구/부위 라벨(서버에서 붙인다 — 카탈로그는 크다). */
export type TodayPrescriptionRow = TodayPlanRow & { name: string; equipments: EquipmentId[]; focusLabel: string };

const field = "w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function MemberPrescription({ connectionId, memberId, memberName, exercises }: {
  connectionId: string; memberId: string; memberName: string; exercises: PrescriptionRow[];
}) {
  const [query, setQuery] = useState("");
  const matching = exercises.filter(row => `${row.name} ${row.dayLabel} ${isDayBlockId(row.focus) ? DAY_BLOCKS[row.focus].label : row.focus}`.includes(query.trim()));
  const days = [...new Set(matching.map(row => row.day_index))].sort((a, b) => (a ?? -1) - (b ?? -1));
  return <section className="space-y-4" aria-labelledby="prescription-title">
    <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"><Dumbbell size={20} aria-hidden="true" /></span><div className="min-w-0 space-y-1"><h2 id="prescription-title" className="text-lg font-bold">운동 처방 · 영구 루틴</h2>
      <p className="text-sm leading-6 text-muted">반복되는 루틴을 변경해요. 오늘만 설정한 계획과 과거 기록은 유지돼요.</p>
      <p className="text-sm font-semibold">{memberName} 님 · {exercises.length}개 운동</p></div></div>
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-zinc-50 px-4 dark:bg-zinc-900"><Search size={18} className="shrink-0 text-muted" aria-hidden="true" /><input aria-label="처방 운동 찾기" placeholder="운동 이름, 부위, 일차로 찾기" value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label>
    {query && <p role="status" className="text-sm text-muted">{matching.length ? `${matching.length}개 운동을 찾았어요.` : "일치하는 운동이 없어요. 다른 이름이나 부위로 찾아보세요."}</p>}
    {exercises.length === 0 ? <p className="app-card p-5 text-sm text-muted">회원이 운동을 등록하면 여기서 처방할 수 있어요.</p> : days.map((day, index) => {
      const rows = matching.filter(row => row.day_index === day);
      const focuses = [...new Set(rows.map(row => isDayBlockId(row.focus) ? DAY_BLOCKS[row.focus].label : row.focus))];
      return <details key={day ?? "common"} open={!!query || index === 0} className="group app-card p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 [&::-webkit-details-marker]:hidden">
          <div><h3 className="font-bold">{rows[0].dayLabel}</h3><p className="mt-1 text-sm text-muted">{focuses.join(" · ")} · {rows.length}개 운동</p></div>
          <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{rows.map(row => <PrescriptionEditor key={row.id + ":" + row.updated_at} connectionId={connectionId} memberId={memberId} memberName={memberName} row={row} />)}</div>
      </details>;
    })}
  </section>;
}

/**
 * **오늘만 처방** — 회원의 오늘 운동만 바꾼다. 영구 루틴은 그대로다(원칙 #2).
 *
 * 🔴 오늘만 오버라이드는 **부위 단위 통째 교체**라, 한 줄만 고쳐도 그 부위 전체가
 *    오늘 계획으로 고정된다(서버가 루틴에서 복사한다). 트레이너가 그걸 모르면
 *    "왜 다른 운동까지 오늘 계획이 됐지" 가 되므로 화면에서 미리 말해 준다.
 */
export function MemberTodayPrescription({ connectionId, memberId, memberName, dateLabel, rows, notice }: {
  connectionId: string; memberId: string; memberName: string; dateLabel: string;
  rows: TodayPrescriptionRow[]; notice: string | null;
}) {
  const groups = groupTodayRowsByFocus(rows);
  return <section className="space-y-3" aria-labelledby="today-prescription-title">
    <h2 id="today-prescription-title" className="text-lg font-bold">운동 처방 · 오늘만</h2>
    <p className="text-sm text-zinc-500">{memberName} 님의 <b>{dateLabel} 하루치</b>만 바꿉니다. 영구 루틴은 그대로라 내일부터는 원래 루틴으로 돌아갑니다. 변경 내역은 회원에게 코멘트로 남습니다.</p>
    {notice ? <p className="py-4 text-sm">{notice}</p> : groups.map(group => <div key={group.focus} className="space-y-3">
      <h3 className="text-sm font-bold text-zinc-500">{group.rows[0]?.focusLabel ?? group.focus}{group.rows.some(r => r.source === "routine") ? " · 아직 루틴 그대로" : " · 오늘만 계획 적용 중"}</h3>
      {group.rows.map(row => <TodayPrescriptionEditor key={`${row.focus}:${row.position}:${row.exercise_id}`}
        connectionId={connectionId} memberId={memberId} memberName={memberName} dateLabel={dateLabel} row={row} />)}
    </div>)}
  </section>;
}

/** 운동 검색·선택·세트/횟수/중량 입력 + 확인 — 두 처방 축이 같은 폼을 쓴다. */
function PrescriptionFields({ input, setInput, name, setName, equipments, setEquipments, setMessage, showSetDetailWarning, start }: {
  input: PrescriptionInput; setInput: (v: PrescriptionInput) => void;
  name: string; setName: (v: string) => void;
  equipments: EquipmentId[]; setEquipments: (v: EquipmentId[]) => void;
  setMessage: (v: string) => void; showSetDetailWarning: boolean;
  start: (fn: () => void) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchPrescriptionExercises>>>([]);
  const [searched, setSearched] = useState(false);
  return <>
    <div className="flex gap-2"><input aria-label="변경할 운동 검색" placeholder="운동 이름 또는 부위 검색" className={field} value={query} onChange={e => { setQuery(e.target.value); setHits([]); setSearched(false); }} />
      <button type="button" className="shrink-0 rounded-lg border px-3" onClick={() => start(async () => {
        try { setHits(await searchPrescriptionExercises(query)); setSearched(true); } catch { setMessage("검색하지 못했어요. 다시 시도해 주세요."); }
      })}>검색</button></div>
    {searched && hits.length === 0 && <p className="text-sm">검색 결과가 없어요.</p>}
    <ul className="max-h-48 overflow-auto">{hits.map(hit => <li key={hit.id}><button type="button" className="w-full p-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => {
      setInput({ ...input, exerciseId: hit.id, equipment: hit.equipments[0], weightKg: null }); setName(hit.name); setEquipments(hit.equipments as EquipmentId[]); setHits([]); setSearched(false);
    }}>{hit.name}</button></li>)}</ul>
    <p className="text-sm font-semibold">선택한 운동: {name}</p>
    <label className="block text-sm">기구<select aria-label="기구" className={field} value={input.equipment} onChange={e => setInput({ ...input, equipment: e.target.value, weightKg: null })}>{equipments.map(e => <option key={e} value={e}>{EQUIPMENT_LABELS[e]}</option>)}</select></label>
    <div className="grid grid-cols-3 gap-2">
      <label className="text-sm">세트<input type="number" min="1" max="20" required className={field} value={input.sets || ""} onChange={e => setInput({ ...input, sets: Number(e.target.value) })} /></label>
      <label className="text-sm">횟수<input type="number" min="1" max="100" required className={field} value={input.reps || ""} onChange={e => setInput({ ...input, reps: Number(e.target.value) })} /></label>
      <label className="text-sm">중량(kg)<input type="number" min="0" max="9999.9" step="0.1" className={field} value={input.weightKg ?? ""} onChange={e => setInput({ ...input, weightKg: e.target.value === "" ? null : Number(e.target.value) })} /></label>
    </div>
    {showSetDetailWarning && <p className="text-sm text-amber-700 dark:text-amber-400">저장하면 기존 세트별 설정은 위의 동일한 세트·횟수·중량으로 바뀝니다.</p>}
  </>;
}

/** 한 줄 처방 카드(축 공통) — 저장 동작만 `save` 로 갈아끼운다. */
function PrescriptionCard({ contextLabel, rowName, summary, memberName, initial, equipments: initialEquipments, showSetDetailWarning, save, extraNote }: {
  /** "3일차", "오늘(9월 20일) · 가슴" 처럼 **무엇을 바꾸는지** 한 줄. */
  contextLabel: string;
  rowName: string;
  summary: string;
  memberName: string;
  initial: PrescriptionInput;
  equipments: EquipmentId[];
  showSetDetailWarning: boolean;
  save: (input: PrescriptionInput | null) => Promise<{ ok: boolean; error?: string }>;
  /** 확인 단계에 덧붙일 주의 문구(오늘만 처방의 '부위 통째 고정' 안내). */
  extraNote?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState<PrescriptionInput>(initial);
  const [name, setName] = useState(rowName);
  const [equipments, setEquipments] = useState<EquipmentId[]>(initialEquipments);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<"save" | "delete" | null>(null);
  const [pending, start] = useTransition();
  function submit() {
    const deleting = confirm === "delete";
    start(async () => {
      try {
        const result = await save(deleting ? null : input);
        if (!result.ok) { setMessage(result.error!); setConfirm(null); return; }
        setMessage(deleting ? "삭제했어요." : "처방을 저장했어요.");
        setEditing(false); setConfirm(null); router.refresh();
      } catch { setMessage("연결을 확인한 뒤 다시 시도해 주세요."); setConfirm(null); }
    });
  }
  return <article className="self-start space-y-3 rounded-xl border border-line bg-white p-4 dark:bg-zinc-950">
    <p className="text-xs text-zinc-500">{contextLabel}</p>
    <h3 className="text-lg font-bold">{rowName}</h3>
    <div className="flex flex-wrap gap-2">{summary.split(" · ").map(part => <span key={part} className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium tabular-nums dark:bg-zinc-800">{part}</span>)}</div>
    {editing && <fieldset disabled={pending || confirm !== null} className="space-y-3">
      <legend className="sr-only">{rowName} 처방 변경</legend>
      <PrescriptionFields input={input} setInput={setInput} name={name} setName={setName}
        equipments={equipments} setEquipments={setEquipments} setMessage={setMessage}
        showSetDetailWarning={showSetDetailWarning} start={start} />
      <button type="button" className="rounded-lg bg-brand px-4 py-2 text-sm text-white dark:text-zinc-950" onClick={() => setConfirm("save")}>변경 내용 확인</button>
    </fieldset>}
    {!confirm && <div className="flex gap-3"><button type="button" disabled={pending} className="min-h-11 flex-1 rounded-lg bg-brand/10 px-4 py-2 text-sm font-semibold text-brand" onClick={() => { setEditing(!editing); setMessage(""); }}> {editing ? "닫기" : "운동 변경"}</button><button type="button" disabled={pending} className="min-h-11 rounded-lg px-3 py-2 text-sm text-muted" onClick={() => setConfirm("delete")}>운동 삭제</button></div>}
    {confirm && <div className="space-y-2 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
      <p className="text-sm">{memberName} 님의 {contextLabel}에서 {confirm === "delete" ? `${rowName} 운동을 삭제할까요?` : `${name} · ${input.sets}세트 × ${input.reps}회 · ${input.weightKg === null ? "중량 미설정" : `${input.weightKg}kg`}로 변경할까요?`}</p>
      {extraNote && <p className="text-sm text-amber-700 dark:text-amber-400">{extraNote}</p>}
      <div className="flex gap-3"><button type="button" disabled={pending} onClick={submit} className="rounded-lg bg-brand px-3 py-2 text-sm text-white dark:text-zinc-950">{pending ? "저장 중…" : confirm === "delete" ? "삭제 확정" : "처방 저장"}</button><button type="button" disabled={pending} onClick={() => setConfirm(null)}>취소</button></div>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </article>;
}

function PrescriptionEditor({ connectionId, memberId, memberName, row }: {
  connectionId: string; memberId: string; memberName: string; row: PrescriptionRow;
}) {
  return <PrescriptionCard
    contextLabel={`${row.dayLabel} · ${isDayBlockId(row.focus) ? DAY_BLOCKS[row.focus].label : row.focus}`}
    rowName={row.name}
    summary={`${row.sets}세트 × ${row.reps}회 · ${row.weight_kg === null ? "중량 미설정" : `${row.weight_kg}kg`} · ${EQUIPMENT_LABELS[row.equipment as EquipmentId] ?? row.equipment}`}
    memberName={memberName}
    initial={{ exerciseId: row.exercise_id, equipment: row.equipment, sets: row.sets, reps: row.reps, weightKg: row.weight_kg }}
    equipments={row.equipments}
    showSetDetailWarning={Array.isArray(row.set_details) && row.set_details.length > 0}
    save={input => prescribeMemberExercise(connectionId, memberId, row.id, row.updated_at, input)}
  />;
}

function TodayPrescriptionEditor({ connectionId, memberId, memberName, dateLabel, row }: {
  connectionId: string; memberId: string; memberName: string; dateLabel: string; row: TodayPrescriptionRow;
}) {
  return <PrescriptionCard
    contextLabel={`${dateLabel} · ${row.focusLabel}`}
    rowName={row.name}
    summary={`${row.sets}세트 × ${row.reps}회 · ${row.weight_kg === null ? "중량 미설정" : `${row.weight_kg}kg`} · ${EQUIPMENT_LABELS[row.equipment as EquipmentId] ?? row.equipment}`}
    memberName={memberName}
    initial={{ exerciseId: row.exercise_id, equipment: row.equipment, sets: row.sets, reps: row.reps, weightKg: row.weight_kg }}
    equipments={row.equipments}
    showSetDetailWarning={false}
    extraNote={row.source === "routine"
      ? `${row.focusLabel} 운동 전체가 ${dateLabel} 하루치 계획으로 고정됩니다. 영구 루틴은 바뀌지 않아요.`
      : null}
    save={input => prescribeMemberToday(connectionId, memberId, row.focus, row.position, row.exercise_id, input)}
  />;
}
