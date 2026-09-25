import { primaryBodyPart } from "./exercise-body-parts";
import type { CatalogExercise, EquipmentId } from "./exercise-catalog-labels";
import { isEquipmentAvailable } from "@/features/gym/gym-equipment-mapping";
import { subMusclesForExercise } from "./muscle-detail";
import { overloadPlan } from "./overload";
import type { RecommendationContext } from "./recommendation-preferences";

/** Rank within the selected body-part scope; never replace another day's routine. */
export function personalizeExercises(base: CatalogExercise[], candidates: CatalogExercise[], gym: ReadonlySet<string> | null, context: RecommendationContext | null, side = false, focus?: string): CatalogExercise[] {
  if (!context) return base;
  const p=context.preferences;
  const preferred = (equipment: EquipmentId) => p.equipment === "machine" ? ["machine","cable","smith"].includes(equipment) : p.equipment === "freeweight" ? ["barbell","dumbbell","kettlebell"].includes(equipment) : false;
  const history = new Set(context.records.map(row=>row.exerciseId));
  const candidatesById = new Map([...base,...candidates].map(ex=>[ex.id,ex]));
  const pool = [...candidatesById.values()].map(ex => ({...ex,equipments:ex.equipments.filter(eq=>isEquipmentAvailable(eq.equipment,gym)).sort((a,b)=>Number(preferred(b.equipment))-Number(preferred(a.equipment)))})).filter(ex=>ex.equipments.length>0);
  const score = (ex: CatalogExercise) => {
    const baseIndex=base.findIndex(item=>item.id===ex.id);
    let value=baseIndex>=0 ? context.explicitPreferences ? 6 : 8-baseIndex : 0;
    const body=primaryBodyPart(ex.id);
    if(p.priority === "lower" && body === "lower" || p.priority === "upper" && ["chest","back","shoulder","arm"].includes(body)) value+=4;
    if(ex.equipments.some(eq=>preferred(eq.equipment))) value+=12;
    if(history.has(ex.id)) value+=p.variety==="familiar" ? 16 : 4;
    if(context.experience==="beginner" && ex.equipments.some(eq=>["machine","cable","bodyweight"].includes(eq.equipment))) value+=2;
    if(history.has(ex.id) && overloadPlan(context.records,ex.id,context.experience,undefined,ex.equipments[0].equipment).action==="rest") value-=20;
    return value;
  };
  const desired = side ? (p.minutes===30 ? 1 : 2) : p.minutes===30 ? 2 : p.minutes===45 || context.experience==="beginner" || context.goal!=="muscle_gain" ? 3 : 4;
  const scores=new Map(pool.map(ex=>[ex.id,score(ex)]));
  const muscles=new Map(pool.map(ex=>[ex.id,subMusclesForExercise(ex.id)]));
  const selected: CatalogExercise[]=[];const covered=new Set<string>();
  while(pool.length && selected.length<desired) {
    pool.sort((a,b)=> {
      const novelty=(ex:CatalogExercise)=>muscles.get(ex.id)!.filter(sub=>!covered.has(sub.id)).length;
      const fullbodyBalance=(ex:CatalogExercise)=>focus === "fullbody" && selected.length===1 && (primaryBodyPart(ex.id)==="lower") !== (primaryBodyPart(selected[0].id)==="lower") ? 100 : 0;
      return (scores.get(b.id)!+novelty(b)*6+fullbodyBalance(b))-(scores.get(a.id)!+novelty(a)*6+fullbodyBalance(a)) || a.id.localeCompare(b.id);
    });
    const next=pool.shift()!;selected.push(next);
    subMusclesForExercise(next.id).forEach(sub=>covered.add(sub.id));
  }
  return selected;
}