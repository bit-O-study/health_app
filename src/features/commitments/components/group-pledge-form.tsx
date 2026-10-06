"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroupPledgeAction } from "../group-pledge-actions";

const field = "h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-800";

export function GroupPledgeForm({ groupId, today, memberCount }: { groupId: string; today: string; memberCount: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full border border-brand px-4 text-sm font-semibold text-brand">그룹 전체 다짐 만들기</button>;
  return (
    <form className="app-card space-y-3 p-4" data-testid="group-pledge-form" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      setError("");
      startTransition(async () => {
        const result = await createGroupPledgeAction({ groupId, title: String(data.get("title")), startDate: String(data.get("start")), days: Number(data.get("days")), workoutDays: Number(data.get("workout")) || null, mealsPerDay: Number(data.get("meals")) || null });
        if (!result.ok) { setError(result.error); return; }
        form.reset(); setOpen(false); router.refresh();
      });
    }}>
      <h3 className="text-sm font-bold">우리 그룹 전체 다짐</h3>
      <p className="text-xs text-zinc-500">현재 멤버 {memberCount}명 모두 참여해요. 나중에 가입한 멤버는 다음 다짐부터 참여하고, 탈퇴한 멤버는 명단에서 제외해요.</p>
      <fieldset disabled={pending} className="space-y-3 disabled:opacity-50">
        <label className="block space-y-1 text-sm">다짐 이름<input name="title" required maxLength={40} className={field} placeholder="예: 우리 모두 주 3일 운동" /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0 space-y-1 text-sm">시작일<input name="start" type="date" min={today} defaultValue={today} required className={field} /></label>
          <label className="min-w-0 space-y-1 text-sm">기간<select name="days" defaultValue="30" className={field}>{[7, 14, 30, 60, 90].map((n) => <option key={n} value={n}>{n}일</option>)}</select></label>
        </div>
        <label className="block space-y-1 text-sm">주 운동 일수<select name="workout" defaultValue="3" className={field}><option value="0">설정 안 함</option>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>주 {n}일</option>)}</select></label>
        <label className="block space-y-1 text-sm">매일 식단 기록<select name="meals" defaultValue="0" className={field}><option value="0">설정 안 함</option>{[1, 2, 3].map((n) => <option key={n} value={n}>하루 {n}끼</option>)}</select></label>
        <p className="text-xs text-zinc-500">목표를 하나 이상 선택해 주세요. 시작일부터 7일마다 기록으로 판정하며, 마지막 짧은 기간은 운동 목표를 비례해 줄여요. 실패한 멤버의 이름과 다짐은 그룹 상단에 표시돼요. 개인 식단·체성분은 공개하지 않아요. 생성 후 목표는 변경할 수 없어요.</p>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 flex-1 rounded-full border border-zinc-300 text-sm">취소</button>
          <button type="submit" className="min-h-11 flex-1 rounded-full bg-brand px-3 text-sm font-semibold text-white dark:text-zinc-950">{pending ? "만드는 중…" : "전체 다짐 저장"}</button>
        </div>
      </fieldset>
    </form>
  );
}
