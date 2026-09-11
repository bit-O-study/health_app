import { routineDaySlots, type DayBlockId } from "@/features/routine/data";
import { ALL_FOCUSES, prescribe } from "@/features/routine/exercise-catalog";
import { focusExercisesForSlot, sideExercisesForSlot } from "@/features/routine/recommend";
import { conditioningDefaults, defaultsFor } from "@/features/routine/conditioning-catalog";
import { ALL_GYM_EQUIPMENT_IDS } from "@/features/gym/gym-equipment-catalog";
import { isEquipmentAvailable, toGymEquipmentSet } from "@/features/gym/gym-equipment-mapping";
import { openAuthenticatedDbClient } from "./db";
import { runEmailPrefix } from "./run-scope";

type Options = Parameters<typeof prescribe>[1];
type Setup = {
  user_id: string; gender: Options["gender"]; experience: Options["experience"];
  body_type: Options["bodyType"] | null; weight_kg: number | null;
  splits: number; variant_id: string; custom_week: DayBlockId[][] | null;
  updated_at: string; equipment_ids: string[] | null;
};

/** Test-only preparation; uses the same recommendation functions and write RPC as the UI. */
export async function prepareRecommendedExercises(email: string): Promise<void> {
  const prefix = runEmailPrefix();
  if (!prefix || !email.startsWith(prefix)) throw new Error("Recommendation fixture requires an account owned by this E2E run");
  const client = await openAuthenticatedDbClient(email);
  try {
    const { rows: setups } = await client.query<Setup>(
      "select p.user_id, p.gender, p.experience, p.body_type, p.weight_kg," +
      " r.splits, r.variant_id, r.custom_week, r.updated_at::text, g.equipment_ids" +
      " from public.profiles p join public.user_routines r on r.user_id=p.user_id" +
      " left join public.gyms g on g.id=p.gym_id where p.user_id=auth.uid()",
    );
    const setup = setups[0];
    if (!setup) throw new Error("Recommendation fixture requires a profile and routine");
    const gymSet = toGymEquipmentSet(setup.equipment_ids?.filter(id => ALL_GYM_EQUIPMENT_IDS.has(id)) ?? null);
    const opts = { gender: setup.gender, experience: setup.experience,
      bodyType: setup.body_type ?? "average", weightKg: setup.weight_kg ?? 65 };
    const { rows: oldRows } = await client.query<{ id: string; day_index: number | null; focus: string; exercise_id: string }>(
      "select id, day_index, focus, exercise_id from public.routine_exercises where user_id=auth.uid()",
    );
    const key = (day: number | null, focus: string, exercise: string) => [day ?? 0, focus, exercise].join(":");
    const oldIds = new Map(oldRows.map(r => [key(r.day_index, r.focus, r.exercise_id), r.id]));
    const groups = routineDaySlots(setup.splits, setup.variant_id, setup.custom_week).map(slot => {
      const exercises = slot.isSide
        ? sideExercisesForSlot(slot.focus, slot.blockIds, setup.gender)
        : focusExercisesForSlot(slot.focus, slot.blockIds, setup.gender);
      return { dayIndex: slot.dayIndex, focus: slot.focus, rows: exercises.map((ex, position) => {
        const p = prescribe(ex.id, opts);
        const id = oldIds.get(key(slot.dayIndex, slot.focus, ex.id));
        return { ...(id ? { id } : {}), position, exerciseId: ex.id,
          equipment: (ex.equipments.find(eq => isEquipmentAvailable(eq.equipment, gymSet)) ?? ex.equipments[0]).equipment,
          sets: p.sets, reps: p.reps, weightKg: p.weightKg, setDetails: null, memo: null };
      }) };
    });
    await client.query("select * from public.replace_routine_exercise_groups($1::timestamptz, true, $2::jsonb)",
      [setup.updated_at, JSON.stringify(groups)]);
    const conditioning = ALL_FOCUSES.flatMap(focus => (["warmup", "cooldown"] as const).flatMap(kind =>
      defaultsFor(focus, kind).map((itemId, position) => {
        const d = conditioningDefaults(itemId);
        return { user_id: setup.user_id, focus, kind, position, item_id: itemId,
          duration_min: d.durationMin, speed: d.speed, incline: d.incline, sets: d.sets, reps: d.reps };
      })));
    await client.query("delete from public.routine_conditioning where user_id=auth.uid()");
    await client.query(
      "insert into public.routine_conditioning (user_id, focus, kind, position, item_id, duration_min, speed, incline, sets, reps)" +
      " select user_id, focus, kind, position, item_id, duration_min, speed, incline, sets, reps" +
      " from jsonb_populate_recordset(null::public.routine_conditioning, $1::jsonb)", [JSON.stringify(conditioning)]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
