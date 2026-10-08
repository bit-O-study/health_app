"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Star, Plus, Trash2 } from "lucide-react";
import { addFoodLogAction } from "../diet-actions";
import { MEALS, MEAL_LABEL, type Meal } from "../meal";
import { type RecentFood } from "../quick-add";

const event = "diet-favorites-changed";
function subscribe(callback: () => void) { window.addEventListener("storage",callback); window.addEventListener(event,callback); return () => { window.removeEventListener("storage",callback); window.removeEventListener(event,callback); }; }
const foodKey = (food: RecentFood) => `${food.name}\u0000${food.amount ?? ""}`;
export function FoodFavorites({ userId, recent }: { userId: string; recent: RecentFood[] }) {
  const key=`helssu:food-favorites:${userId}`;
  const stored=useSyncExternalStore(subscribe,()=>{try{return localStorage.getItem(key)??"[]";}catch{return "[]";}},()=>"[]");
  let favorites: RecentFood[]=[];
  try { const parsed: unknown=JSON.parse(stored); if(Array.isArray(parsed)) favorites=parsed.filter((row): row is RecentFood => !!row && typeof row.name==="string" && typeof row.kcal==="number"); } catch { /* Ignore an unreadable local list. */ }
  const candidates=[...new Map(recent.map(food=>[foodKey(food),food])).values()].filter(food=>!favorites.some(saved=>foodKey(saved)===foodKey(food)));
  const [meal,setMeal]=useState<Meal>("breakfast");
  const [message,setMessage]=useState("");
  const [pending,start]=useTransition();
  function save(next: RecentFood[]) { try { localStorage.setItem(key,JSON.stringify(next)); window.dispatchEvent(new Event(event)); setMessage(""); } catch { setMessage("즐겨찾기를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요."); } }
  function add(food:RecentFood) { start(async()=>{const result=await addFoodLogAction({...food,meal,eatenAt:null}); setMessage(result.ok?`오늘 ${MEAL_LABEL[meal]}에 ${food.name}을 담았어요.`:result.error);}); }
  return <div className="space-y-5">
    <p className="text-sm text-muted">자주 먹는 음식을 저장하고 오늘 식단에 바로 담으세요.<br />즐겨찾기는 이 브라우저에 계정별로 저장돼요.</p>
    <label className="flex items-center gap-3 text-sm font-semibold">담을 끼니<select aria-label="담을 끼니" value={meal} onChange={e=>setMeal(e.target.value as Meal)} className="min-h-11 rounded-xl border border-line bg-background px-3">{MEALS.map(value=><option key={value} value={value}>{MEAL_LABEL[value]}</option>)}</select></label>
    {message && <p role="status" className="text-sm text-brand">{message}</p>}
    <section aria-label="저장한 음식" className="app-card divide-y divide-line">{!favorites.length && <p className="p-5 text-sm text-muted">아래 최근 음식에서 별을 눌러 저장하세요.</p>}{favorites.map(food=><div key={foodKey(food)} className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><h3 className="font-semibold">{food.name}</h3><p className="text-xs text-muted">{food.amount} · {food.kcal} kcal</p></div><button disabled={pending} onClick={()=>add(food)} aria-label={`${food.name} 담기`} className="min-h-11 min-w-11 text-brand"><Plus aria-hidden="true" className="mx-auto"/></button><button onClick={()=>save(favorites.filter(saved=>foodKey(saved)!==foodKey(food)))} aria-label={`${food.name} 즐겨찾기 해제`} className="min-h-11 min-w-11 text-muted"><Trash2 size={18} aria-hidden="true" className="mx-auto"/></button></div>)}</section>
    <section className="space-y-3"><h3 className="app-section-label">최근 30일 음식</h3>{!candidates.length && <p className="text-sm text-muted">새로 저장할 최근 음식이 없어요.</p>}<div className="app-card divide-y divide-line">{candidates.map(food=><button key={foodKey(food)} onClick={()=>save([...favorites,food])} aria-label={`${food.name} 즐겨찾기 추가`} className="flex min-h-14 w-full items-center gap-3 p-4 text-left"><Star size={20} aria-hidden="true" className="text-brand"/><span className="flex-1 font-semibold">{food.name}</span><span className="text-xs text-muted">{food.kcal} kcal</span></button>)}</div></section>
  </div>;
}
