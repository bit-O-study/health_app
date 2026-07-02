import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  strengthKcalForCompletion,
  estimateConditioningKcal,
} from "@/features/routine/calories";
import {
  conditioningDefaults,
  getConditioningItem,
} from "@/features/routine/conditioning-catalog";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { seoulYmd } from "@/features/routine/data";
import { resolveMemberName } from "@/features/groups/member-name";
import {
  weekRange,
  addDaysYmd,
  rankMembers,
  type MemberStat,
  type RankedMember,
} from "@/features/groups/ranking";
import { computeWorkoutStreak } from "@/features/groups/streak";
import { coinsForLevel, COINS_PER_WORKOUT } from "@/features/groups/gym";
import { cheersByTarget } from "@/features/groups/cheers";
import {
  challengeProgress,
  isChallengeMetric,
  type ChallengeProgress,
} from "@/features/groups/challenge";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type GroupSummary = {
  id: string;
  name: string;
  inviteToken: string;
  isOwner: boolean;
  memberCount: number;
};

/** 내가 속한 그룹 목록. 요청 내 중복 호출(네비 + 페이지) 캐시. */
export const getMyGroups = cache(async (): Promise<GroupSummary[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data: mem } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);
  const ids = (mem ?? []).map((r) => (r as { group_id: string }).group_id);
  if (ids.length === 0) return [];

  const [{ data: groups }, { data: allMem }] = await Promise.all([
    supabase.from("groups").select("id, name, owner_id, invite_token").in("id", ids),
    supabase.from("group_members").select("group_id").in("group_id", ids),
  ]);

  const counts = new Map<string, number>();
  for (const r of (allMem ?? []) as { group_id: string }[]) {
    counts.set(r.group_id, (counts.get(r.group_id) ?? 0) + 1);
  }

  return ((groups ?? []) as {
    id: string;
    name: string;
    owner_id: string;
    invite_token: string;
  }[])
    .map((g) => ({
      id: g.id,
      name: g.name,
      inviteToken: g.invite_token,
      isOwner: g.owner_id === user.id,
      memberCount: counts.get(g.id) ?? 1,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
});

export type GroupDetail = {
  id: string;
  name: string;
  inviteToken: string;
  isOwner: boolean;
  weekFrom: string;
  weekTo: string;
  today: string;
  ranking: RankedMember[];
  /** 오늘 기준, 멤버(userId)별 받은 응원 문구(작성자 이름 포함). */
  cheers: Record<string, CheerView[]>;
  /** 이번 주 그룹 챌린지(목표+진행률). 없으면 null. */
  challenge: ChallengeProgress | null;
  /** 그룹 공유 펫(코인·레벨). */
  pet: GroupPet;
};

/** 그룹 공유 펫 — 그룹당 1마리. 운동 코인으로 함께 레벨업. */
export type GroupPet = {
  name: string;
  level: number;
  /** 사용 가능한(아직 안 넣은) 코인. */
  coins: number;
  /** 다음 레벨에 이미 넣은 코인. */
  progress: number;
  /** 다음 레벨업 비용(코인). */
  nextCost: number;
  /** 그룹 전체 누적 운동 수. */
  groupWorkouts: number;
  /** 지금까지 늑대에게 쓴(레벨업에 소비한) 코인 누적. */
  coinsSpent: number;
  memberCount: number;
  /** 보유 꾸미기 아이템 id 목록. */
  owned: string[];
  /** 착용 중인 꾸미기(slot -> itemId). */
  equipped: Record<string, string>;
};

/** 응원 문구 표시용 — 작성자 이름 + 내용 + 내가 쓴 것인지. */
export type CheerView = {
  fromUser: string;
  fromName: string;
  message: string;
  mine: boolean;
};

/** 그룹 상세 + 이번 주 운동 랭킹. 내가 멤버가 아니면 null. */
export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  // 그룹 정보와 멤버 목록은 독립 → 병렬로(한 라운드트립 절약).
  const [{ data: group }, { data: members }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, owner_id, invite_token")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, display_name")
      .eq("group_id", groupId),
  ]);
  if (!group) return null;
  const g = group as { id: string; name: string; owner_id: string; invite_token: string };

  const memberRows = (members ?? []) as { user_id: string; display_name: string | null }[];
  const memberIds = memberRows.map((r) => r.user_id);
  if (!memberIds.includes(user.id)) return null; // 멤버 아님

  const today = seoulYmd();
  const { from, to } = weekRange(today);
  // 스트릭용 — 지난 60일 운동일(근력+컨디셔닝) 조회 범위.
  const streakFrom = addDaysYmd(today, -60);

  const [
    { data: profiles },
    { data: exRows },
    { data: condRows },
    { data: foodRows },
    { data: mealPhotoRows },
    { data: exDateRows },
    { data: condDateRows },
    { data: cheerRows },
    { data: challengeRow },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, name, nickname, weight_kg")
      .in("user_id", memberIds),
    supabase
      .from("exercise_completions")
      .select("user_id, for_date, exercise_id, sets")
      .in("user_id", memberIds)
      .eq("status", "done")
      .gte("for_date", from)
      .lte("for_date", to),
    supabase
      .from("conditioning_completions")
      .select("user_id, for_date, item_id, duration_min, speed")
      .in("user_id", memberIds)
      .eq("status", "done")
      .gte("for_date", from)
      .lte("for_date", to),
    supabase
      .from("food_logs")
      .select("user_id, kcal")
      .in("user_id", memberIds)
      .eq("for_date", today),
    supabase
      .from("meal_photos")
      .select("user_id, meal, photo_url")
      .in("user_id", memberIds)
      .eq("for_date", today),
    supabase
      .from("exercise_completions")
      .select("user_id, for_date")
      .in("user_id", memberIds)
      .eq("status", "done")
      .gte("for_date", streakFrom)
      .lte("for_date", today),
    supabase
      .from("conditioning_completions")
      .select("user_id, for_date")
      .in("user_id", memberIds)
      .eq("status", "done")
      .gte("for_date", streakFrom)
      .lte("for_date", today),
    supabase
      .from("group_cheers")
      .select("to_user, from_user, message")
      .eq("group_id", groupId)
      .eq("for_date", today),
    supabase
      .from("group_challenges")
      .select("metric, target")
      .eq("group_id", groupId)
      .eq("week_from", from)
      .maybeSingle(),
  ]);


  const nameOf = new Map<string, string>();
  const weightOf = new Map<string, number>();
  // 그룹 닉네임(가입 스냅샷) — 표시 이름 결정에 보조로 사용.
  const dispOf = new Map<string, string | null>();
  for (const r of memberRows) dispOf.set(r.user_id, r.display_name);
  // 표시 이름 = 프로필 이름(최신) 우선 → 그룹 닉네임 → "회원".
  for (const p of (profiles ?? []) as {
    user_id: string;
    name: string | null;
    nickname: string | null;
    weight_kg: number | string | null;
  }[]) {
    nameOf.set(
      p.user_id,
      resolveMemberName(p.nickname, p.name, dispOf.get(p.user_id)),
    );
    weightOf.set(p.user_id, num(p.weight_kg) || 65);
  }
  // 프로필 행이 없는 멤버는 가입 스냅샷(display_name)만으로.
  for (const r of memberRows) {
    if (!nameOf.has(r.user_id)) {
      nameOf.set(r.user_id, resolveMemberName(null, null, r.display_name));
    }
  }

  // 오늘 섭취 kcal(식단)
  const todayIntakeOf = new Map<string, number>();
  for (const r of (foodRows ?? []) as { user_id: string; kcal: number | string }[]) {
    todayIntakeOf.set(r.user_id, (todayIntakeOf.get(r.user_id) ?? 0) + num(r.kcal));
  }
  // 오늘 끼니 사진 썸네일(아침→점심→저녁→간식 순)
  const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
  const photosByUser = new Map<string, { meal: string; url: string }[]>();
  for (const r of (mealPhotoRows ?? []) as {
    user_id: string;
    meal: string;
    photo_url: string;
  }[]) {
    if (!r.photo_url) continue;
    const arr = photosByUser.get(r.user_id) ?? [];
    arr.push({ meal: r.meal, url: r.photo_url });
    photosByUser.set(r.user_id, arr);
  }
  const todayPhotosOf = new Map<string, string[]>();
  for (const [uid, arr] of photosByUser) {
    arr.sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal));
    todayPhotosOf.set(uid, arr.map((x) => x.url));
  }
  // 오늘 운동 소비 kcal (raw 누적)
  const todayBurnedOf = new Map<string, number>();
  const addToday = (uid: string, v: number) =>
    todayBurnedOf.set(uid, (todayBurnedOf.get(uid) ?? 0) + v);

  const stats = new Map<string, MemberStat>();
  const ensure = (uid: string): MemberStat => {
    let s = stats.get(uid);
    if (!s) {
      s = {
        userId: uid,
        name: nameOf.get(uid) ?? "회원",
        kcal: 0,
        workouts: 0,
        days: 0,
        todayIntake: 0,
        todayBurned: 0,
        todayPhotos: [],
        streak: 0,
        level: 0,
        isMe: uid === user.id,
      };
      stats.set(uid, s);
    }
    return s;
  };
  for (const uid of memberIds) ensure(uid);

  const daySet = new Map<string, Set<string>>();
  const markDay = (uid: string, date: string) => {
    let set = daySet.get(uid);
    if (!set) {
      set = new Set();
      daySet.set(uid, set);
    }
    set.add(date);
  };

  for (const r of (exRows ?? []) as {
    user_id: string;
    for_date: string;
    exercise_id: string | null;
    sets: number | null;
  }[]) {
    if (!r.exercise_id) continue;
    const s = ensure(r.user_id);
    const v = strengthKcalForCompletion(weightOf.get(r.user_id) ?? 65, r.exercise_id, num(r.sets));
    s.kcal += v;
    s.workouts += 1;
    markDay(r.user_id, r.for_date);
    if (r.for_date === today) addToday(r.user_id, v);
  }
  for (const r of (condRows ?? []) as {
    user_id: string;
    for_date: string;
    item_id: string | null;
    duration_min: number | null;
    speed: number | string | null;
  }[]) {
    if (!r.item_id) continue;
    const d = conditioningDefaults(r.item_id);
    const s = ensure(r.user_id);
    const v = estimateConditioningKcal(
      weightOf.get(r.user_id) ?? 65,
      r.item_id,
      r.duration_min ?? d.durationMin,
      r.speed === null ? d.speed : num(r.speed),
    );
    s.kcal += v;
    s.workouts += 1;
    markDay(r.user_id, r.for_date);
    if (r.for_date === today) addToday(r.user_id, v);
  }

  for (const [uid, set] of daySet) ensure(uid).days = set.size;

  // 스트릭 — 지난 60일 운동일 집합(근력+컨디셔닝 합집합)에서 연속일 계산.
  const streakDatesOf = new Map<string, Set<string>>();
  const addStreakDate = (uid: string, d: string) => {
    let set = streakDatesOf.get(uid);
    if (!set) {
      set = new Set();
      streakDatesOf.set(uid, set);
    }
    set.add(d);
  };
  for (const r of [
    ...((exDateRows ?? []) as { user_id: string; for_date: string }[]),
    ...((condDateRows ?? []) as { user_id: string; for_date: string }[]),
  ]) {
    addStreakDate(r.user_id, r.for_date);
  }

  // 그룹 공유 펫 코인용 — 그룹 전체 누적 운동 수를 '한 번에' 집계(멤버별 2×N → 2쿼리).
  const [{ count: exAll }, { count: condAll }] = await Promise.all([
    supabase
      .from("exercise_completions")
      .select("id", { count: "exact", head: true })
      .in("user_id", memberIds)
      .eq("status", "done"),
    supabase
      .from("conditioning_completions")
      .select("id", { count: "exact", head: true })
      .in("user_id", memberIds)
      .eq("status", "done"),
  ]);
  const groupWorkouts = (exAll ?? 0) + (condAll ?? 0);

  for (const s of stats.values()) {
    s.kcal = Math.round(s.kcal);
    s.todayIntake = Math.round(todayIntakeOf.get(s.userId) ?? 0);
    s.todayBurned = Math.round(todayBurnedOf.get(s.userId) ?? 0);
    s.todayPhotos = todayPhotosOf.get(s.userId) ?? [];
    s.streak = computeWorkoutStreak(streakDatesOf.get(s.userId) ?? [], today);
  }

  // 응원 문구 — 대상자별로 묶고 작성자 이름을 붙인다.
  const cheerMap = cheersByTarget(
    ((cheerRows ?? []) as {
      to_user: string;
      from_user: string;
      message: string;
    }[]).map((r) => ({
      toUser: r.to_user,
      fromUser: r.from_user,
      message: r.message,
    })),
    user.id,
  );
  const cheers: Record<string, CheerView[]> = {};
  for (const [uid, list] of cheerMap) {
    cheers[uid] = list.map((c) => ({
      fromUser: c.fromUser,
      fromName: nameOf.get(c.fromUser) ?? "회원",
      message: c.message,
      mine: c.mine,
    }));
  }

  // 그룹 공유 펫 — 그룹 전체 누적 운동(groupWorkouts, 위에서 집계)으로 코인 적립.
  const { data: petRow } = await supabase
    .from("group_pets")
    .select("name, level, coins, progress, synced_workouts, owned, equipped")
    .eq("group_id", groupId)
    .maybeSingle();
  const pr = petRow as {
    name: string | null;
    level: number | null;
    coins: number | null;
    progress: number | null;
    synced_workouts: number | null;
    owned: unknown;
    equipped: unknown;
  } | null;
  const petName = pr?.name ?? "";
  const petLevelVal = pr?.level ?? 0;
  const petProgress = pr?.progress ?? 0;
  let petCoins = pr?.coins ?? 0;
  let petSynced = pr?.synced_workouts ?? 0;
  if (!pr || groupWorkouts > petSynced) {
    petCoins += Math.max(0, groupWorkouts - petSynced) * COINS_PER_WORKOUT;
    petSynced = groupWorkouts;
    await supabase.from("group_pets").upsert(
      {
        group_id: groupId,
        name: petName,
        level: petLevelVal,
        coins: petCoins,
        synced_workouts: petSynced,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" },
    );
  }
  const pet: GroupPet = {
    name: petName,
    level: petLevelVal,
    coins: petCoins,
    progress: petProgress,
    nextCost: coinsForLevel(petLevelVal),
    groupWorkouts,
    // 늑대에 쓴 코인 = 획득 - 남은 코인(넣은 progress + 레벨업에 소비 합산).
    coinsSpent: Math.max(0, groupWorkouts * COINS_PER_WORKOUT - petCoins),
    memberCount: memberIds.length,
    owned: Array.isArray(pr?.owned) ? (pr!.owned as string[]) : [],
    equipped:
      pr?.equipped && typeof pr.equipped === "object"
        ? (pr.equipped as Record<string, string>)
        : {},
  };

  return {
    id: g.id,
    name: g.name,
    inviteToken: g.invite_token,
    isOwner: g.owner_id === user.id,
    weekFrom: from,
    weekTo: to,
    today,
    ranking: rankMembers([...stats.values()]),
    cheers,
    challenge: (() => {
      const c = challengeRow as { metric: string; target: number } | null;
      if (!c || !isChallengeMetric(c.metric)) return null;
      return challengeProgress(c.metric, c.target, [...stats.values()]);
    })(),
    pet,
  };
}

export type MemberDay = {
  name: string;
  date: string;
  intake: number;
  burned: number;
  foods: { name: string; meal: string; kcal: number }[];
  mealPhotos: { meal: string; photoUrl: string }[];
  workouts: { name: string; detail: string; kcal: number }[];
};

const MEAL_LABEL: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

/** 같은 그룹원의 특정 날짜(기본 오늘) 운동·식단 상세. 내가 그룹원이 아니거나 상대가 멤버가 아니면 null. */
export async function getGroupMemberDay(
  groupId: string,
  memberId: string,
  dateYmd?: string,
): Promise<MemberDay | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const date = dateYmd ?? seoulYmd();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, display_name")
    .eq("group_id", groupId);
  const rows = (members ?? []) as { user_id: string; display_name: string | null }[];
  const ids = rows.map((r) => r.user_id);
  if (!ids.includes(user.id) || !ids.includes(memberId)) return null; // 둘 다 멤버여야

  const [
    { data: profile },
    { data: exRows },
    { data: condRows },
    { data: foodRows },
    { data: photoRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, nickname, weight_kg")
      .eq("user_id", memberId)
      .maybeSingle(),
    supabase
      .from("exercise_completions")
      .select("exercise_id, sets, reps, weight_kg")
      .eq("user_id", memberId)
      .eq("for_date", date)
      .eq("status", "done"),
    supabase
      .from("conditioning_completions")
      .select("item_id, duration_min, speed, sets, reps")
      .eq("user_id", memberId)
      .eq("for_date", date)
      .eq("status", "done"),
    supabase
      .from("food_logs")
      .select("name, meal, kcal, position")
      .eq("user_id", memberId)
      .eq("for_date", date)
      .order("meal", { ascending: true })
      .order("position", { ascending: true }),
    supabase
      .from("meal_photos")
      .select("meal, photo_url")
      .eq("user_id", memberId)
      .eq("for_date", date),
  ]);

  const weight = num((profile as { weight_kg?: number | string | null } | null)?.weight_kg) || 65;
  const prof = profile as { name?: string | null; nickname?: string | null } | null;
  const displayName = resolveMemberName(
    prof?.nickname,
    prof?.name,
    rows.find((r) => r.user_id === memberId)?.display_name,
  );

  let burnedRaw = 0;
  const workouts: MemberDay["workouts"] = [];
  for (const r of (exRows ?? []) as {
    exercise_id: string | null;
    sets: number | null;
    reps: number | null;
  }[]) {
    if (!r.exercise_id) continue;
    const raw = strengthKcalForCompletion(weight, r.exercise_id, num(r.sets));
    burnedRaw += raw;
    const parts: string[] = [];
    if (r.sets != null) parts.push(`${r.sets}세트`);
    if (r.reps != null) parts.push(`${r.reps}회`);
    workouts.push({
      name: getCatalogExercise(r.exercise_id)?.name ?? r.exercise_id,
      detail: parts.join(" · "),
      kcal: Math.round(raw),
    });
  }
  for (const r of (condRows ?? []) as {
    item_id: string | null;
    duration_min: number | null;
    speed: number | string | null;
    sets: number | null;
    reps: number | null;
  }[]) {
    if (!r.item_id) continue;
    const d = conditioningDefaults(r.item_id);
    const raw = estimateConditioningKcal(
      weight,
      r.item_id,
      r.duration_min ?? d.durationMin,
      r.speed === null ? d.speed : num(r.speed),
    );
    burnedRaw += raw;
    const parts: string[] = [];
    if (r.duration_min != null) parts.push(`${r.duration_min}분`);
    if (r.sets != null) parts.push(`${r.sets}세트`);
    if (r.reps != null) parts.push(`${r.reps}회`);
    workouts.push({
      name: getConditioningItem(r.item_id)?.name ?? r.item_id,
      detail: parts.join(" · "),
      kcal: Math.round(raw),
    });
  }

  const foods = ((foodRows ?? []) as {
    name: string;
    meal: string;
    kcal: number | string;
  }[]).map((r) => ({
    name: r.name,
    meal: MEAL_LABEL[r.meal] ?? r.meal,
    kcal: Math.round(num(r.kcal)),
  }));

  const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
  const mealPhotos = ((photoRows ?? []) as { meal: string; photo_url: string }[])
    .filter((r) => r.photo_url)
    .sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal))
    .map((r) => ({ meal: MEAL_LABEL[r.meal] ?? r.meal, photoUrl: r.photo_url }));

  return {
    name: displayName,
    date,
    intake: foods.reduce((s, f) => s + f.kcal, 0),
    burned: Math.round(burnedRaw),
    foods,
    mealPhotos,
    workouts,
  };
}
