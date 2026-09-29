import { readFileSync, writeFileSync } from "node:fs";
import { ALL_EXERCISES } from "../src/features/routine/exercise-catalog";
import { primaryBodyPart } from "../src/features/routine/exercise-body-parts";
const target = "../admin/src/features/health/exercise-catalog.ts";
const current = readFileSync(target, "utf8");
const entries = ALL_EXERCISES.map(e => ({ id: e.id, name: e.name, part: primaryBodyPart(e.id) }));
const next = current.replace(/export const ADMIN_EXERCISES: AdminExercise\[\] = \[[\s\S]*?\n\];/, `export const ADMIN_EXERCISES: AdminExercise[] = ${JSON.stringify(entries, null, 2)};`);
if (next !== current) writeFileSync(target, next);
console.log(`Admin exercise catalog: ${entries.length} entries; ${next === current ? "already current" : "updated"}`);
