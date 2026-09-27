import {describe,it,expect} from "vitest";
import {defaultRecommendationPreferences,parseRecommendationPreferences,personalizedRoutine,recentRecommendationRecords,type RecommendationContext} from "@/features/routine/recommendation-preferences";
import {personalizeExercises} from "@/features/routine/recommend-personalization";
import {primaryBodyPart} from "@/features/routine/exercise-body-parts";
import {EXERCISES} from "@/features/routine/exercise-catalog";
import {normalizeCustomWeek} from "@/features/routine/data";
import type {ProgressRecord} from "@/features/routine/progress";
const record=(date:string,id="bench-press"):ProgressRecord=>({forDate:date,exerciseId:id,status:"done",sets:3,reps:10,weightKg:20});
const context:RecommendationContext={gender:"female",experience:"intermediate",goal:"muscle_gain",preferences:{days:3,minutes:45,priority:"upper",equipment:"mixed",variety:"balanced"},explicitPreferences:true,records:[],today:"2026-09-25"};
describe("personalized recommendations",()=>{
  it("rejects untrusted preferences",()=>{
    for(const patch of [{days:7},{days:"3"},{minutes:31},{minutes:"30"},{priority:"invalid"},{equipment:"invalid"},{variety:"invalid"}]) expect(parseRecommendationPreferences({...context.preferences,...patch})).toBeNull();
    expect(parseRecommendationPreferences(context.preferences)).toEqual(context.preferences);
  });
  it.each([2,3,4,5,6])("builds valid seven-day plan for %i exercise days",days=>{
    const result=personalizedRoutine({...context,preferences:{...context.preferences,days}});
    expect(result.week).toHaveLength(7);expect(result.week.filter(blocks=>!blocks.includes("rest"))).toHaveLength(days);
    expect(normalizeCustomWeek(result.week)).toEqual(result.week);
  });
  it("explicit preference overrides gender defaults",()=>{
    expect(personalizedRoutine(context).week).toEqual(personalizedRoutine({...context,gender:"male"}).week);
    expect(personalizedRoutine(context).week[0]).toEqual(["upper"]);
    expect(personalizedRoutine({...context,preferences:{...context.preferences,priority:"lower"}}).week[0]).toEqual(["lower"]);
  });
  it("filters old, future and skipped records before personalizing",()=>{
    const data=[record("2026-08-28"),record("2026-08-29"),record("2026-09-25"),record("2026-09-26"),{...record("2026-09-22"),status:"skipped" as const}];
    expect(recentRecommendationRecords(data,context.today).map(row=>row.forDate)).toEqual(["2026-08-29","2026-09-25"]);
  });
  it("counts activity days, not number of exercise rows",()=>{
    expect(defaultRecommendationPreferences("male","beginner",Array.from({length:20},()=>record("2026-09-25")),context.today).days).toBe(3);
  });
  it("respects available equipment and never restores unavailable fallback",()=>{
    expect(personalizeExercises([EXERCISES["face-pull"]],[EXERCISES["face-pull"]],new Set(["dumbbell"]),context)).toEqual([]);
  });
  it("puts preferred available equipment first without mutating catalog",()=>{
    const before=EXERCISES["bench-press"].equipments.map(eq=>eq.equipment);
    const result=personalizeExercises([EXERCISES["bench-press"]],[],new Set(["barbell","chest_press"]),{...context,preferences:{...context.preferences,equipment:"machine"}});
    expect(result[0].equipments[0].equipment).toBe("machine");
    expect(EXERCISES["bench-press"].equipments.map(eq=>eq.equipment)).toEqual(before);
  });
  it("familiar preference promotes completed exercises and caps short sessions",()=>{
    const base=[EXERCISES["bench-press"],EXERCISES["incline-press"],EXERCISES["chest-fly"]];
    const result=personalizeExercises(base,base,null,{...context,records:[record("2026-09-24","chest-fly")],preferences:{...context.preferences,minutes:30,variety:"familiar"}});
    expect(result).toHaveLength(2);expect(result[0].id).toBe("chest-fly");expect(new Set(result.map(ex=>ex.id)).size).toBe(2);
  });
  it("keeps both upper and lower exercises in short fullbody recommendations",()=>{
    const candidates=[EXERCISES["bench-press"],EXERCISES["incline-press"],EXERCISES["squat"],EXERCISES["leg-press"]];
    const result=personalizeExercises(candidates,candidates,null,{...context,preferences:{...context.preferences,minutes:30}},false,"fullbody");
    expect(result).toHaveLength(2);
    expect(result.some(ex=>primaryBodyPart(ex.id)==="lower")).toBe(true);
    expect(result.some(ex=>primaryBodyPart(ex.id)!=="lower")).toBe(true);
  });
  it("limits side slots independently",()=>{
    const base=[EXERCISES["biceps-curl"],EXERCISES["hammer-curl"]];
    expect(personalizeExercises(base,base,null,{...context,preferences:{...context.preferences,minutes:30}},true)).toHaveLength(1);
  });
});