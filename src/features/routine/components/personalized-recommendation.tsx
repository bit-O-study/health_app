"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { DAY_BLOCKS } from "../data";
import { personalizedRoutine, type RecommendationContext, type RecommendationPreferences } from "../recommendation-preferences";
import { applyPersonalizedRoutineAction, saveRecommendationPreferencesAction } from "../recommendation-actions";

export function PersonalizedRecommendation({context}: {context:RecommendationContext}) {
  const router=useRouter();const [draft,setDraft]=useState(context.preferences);
  const [pending,start]=useTransition();const [message,setMessage]=useState("");const [confirm,setConfirm]=useState(false);
  const recommendation=personalizedRoutine(context);
  const dirty=JSON.stringify(draft)!==JSON.stringify(context.preferences);
  const field="mt-2 w-full rounded-xl border border-line bg-transparent px-3 py-3 text-sm";
  function save() {start(async()=>{try{const result=await saveRecommendationPreferencesAction(draft);setMessage(result.ok?"추천 선호를 저장했어요.":result.error!);if(result.ok)router.refresh();}catch{setMessage("저장하지 못했어요. 다시 시도해 주세요.");}});}
  function apply() {start(async()=>{try{const result=await applyPersonalizedRoutineAction(recommendation.week);if(!result.ok){setMessage(result.error!);return;}router.push("/routine");router.refresh();}catch{setMessage("추천을 적용하지 못했어요. 다시 시도해 주세요.");}finally{setConfirm(false);}});}
  return <section aria-labelledby="personalized-recommendation-title" className="app-card overflow-hidden">
    <div className="space-y-4 p-5"><p className="flex items-center gap-2 text-sm font-semibold text-brand"><Sparkles size={17} aria-hidden="true" />나에게 맞춘 추천</p>
      <h2 id="personalized-recommendation-title" className="text-xl font-bold">{recommendation.headline}</h2>
      <div className="grid grid-cols-7 gap-1" aria-label="추천 7일 구성">{recommendation.week.map((blocks,index)=><div key={index} className={`rounded-xl px-1 py-3 text-center ${blocks[0]==="rest"?"bg-zinc-100 text-muted dark:bg-zinc-800":"bg-brand/10"}`}><p className="text-xs">{index+1}일차</p><p className="mt-2 text-xs font-semibold">{blocks.map(block=>DAY_BLOCKS[block].label).join("·")}</p></div>)}</div>
      <ul className="space-y-2 text-sm leading-6 text-muted">{recommendation.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
      <p className="text-xs text-muted">보유 기구 분류와 최근 기록을 참고한 제안이에요. 실제 기구와 운동 가능 여부를 확인하고 조절해 주세요.</p>
    </div>
    <details className="border-t border-line p-5"><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={17} aria-hidden="true" />추천 선호 조정</summary>
      <fieldset disabled={pending} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">주당 운동 횟수<select aria-label="주당 운동 횟수" className={field} value={draft.days} onChange={e=>{setDraft({...draft,days:Number(e.target.value)});setConfirm(false);}}>{[2,3,4,5,6].map(n=><option key={n} value={n}>주 {n}회</option>)}</select></label>
        <label className="text-sm">운동 시간<select aria-label="추천 운동 시간" className={field} value={draft.minutes} onChange={e=>{setDraft({...draft,minutes:Number(e.target.value) as RecommendationPreferences["minutes"]});setConfirm(false);}}>{[30,45,60,75].map(n=><option key={n} value={n}>{n}분 내외</option>)}</select></label>
        <label className="text-sm">집중 부위<select aria-label="집중 부위" className={field} value={draft.priority} onChange={e=>{setDraft({...draft,priority:e.target.value as RecommendationPreferences["priority"]});setConfirm(false);}}><option value="balanced">전신 균형</option><option value="upper">상체 중심</option><option value="lower">하체 중심</option></select></label>
        <label className="text-sm">선호 기구<select aria-label="선호 기구" className={field} value={draft.equipment} onChange={e=>{setDraft({...draft,equipment:e.target.value as RecommendationPreferences["equipment"]});setConfirm(false);}}><option value="mixed">골고루</option><option value="machine">머신·케이블 우선</option><option value="freeweight">프리웨이트 우선</option></select></label>
        <label className="text-sm">종목 구성<select aria-label="종목 구성" className={field} value={draft.variety} onChange={e=>{setDraft({...draft,variety:e.target.value as RecommendationPreferences["variety"]});setConfirm(false);}}><option value="balanced">익숙한 운동과 부위 균형</option><option value="familiar">최근 해 본 운동 우선</option></select></label>
      </fieldset>
      <button type="button" disabled={pending} onClick={save} className="mt-4 min-h-11 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50">{pending?"처리 중…":"선호 저장하고 추천 갱신"}</button>
      {dirty&&<p className="mt-2 text-sm text-muted">저장하면 위 추천이 새 조건으로 갱신돼요.</p>}
    </details>
    <div className="space-y-3 border-t border-line p-5">
      {confirm?<div className="space-y-3 rounded-xl bg-brand/5 p-4"><p className="text-sm leading-6">기준 루틴을 위 7일 구성으로 바꿀까요? 오늘 이후의 임시 계획이 초기화되고, 비어 있는 부위에는 추천 운동이 채워져요.</p><div className="flex gap-2"><button type="button" disabled={pending||dirty} onClick={apply} className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950">확인하고 루틴 적용</button><button type="button" disabled={pending} onClick={()=>setConfirm(false)} className="min-h-11 px-4 text-sm">취소</button></div></div>:<button type="button" disabled={pending||dirty} onClick={()=>setConfirm(true)} className="min-h-12 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950">이 추천으로 적용</button>}
      {message&&<p role="status" className="text-sm">{message}</p>}
    </div>
  </section>;
}