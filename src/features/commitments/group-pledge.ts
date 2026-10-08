import type { PledgeStatus } from "./evaluation";

export type GroupWidePledge = {
  id: string;
  groupId: string;
  title: string;
  startDate: string;
  endDate: string;
  days: number;
  workoutDays: number | null;
  mealsPerDay: number | null;
  members: { userId: string; name: string; status: PledgeStatus; failedWeek: number | null }[];
};

/** Deduplicate by account, not display name; preserve which pledges failed. */
export function groupFailures(rows: { userId: string; name: string; title: string; status: PledgeStatus }[]) {
  const people = new Map<string, { userId: string; name: string; titles: string[] }>();
  for (const row of rows) {
    if (row.status !== "failed") continue;
    const person = people.get(row.userId) ?? { userId: row.userId, name: row.name, titles: [] };
    if (!person.titles.includes(row.title)) person.titles.push(row.title);
    people.set(row.userId, person);
  }
  return [...people.values()];
}
