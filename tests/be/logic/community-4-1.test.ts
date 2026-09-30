import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { exerciseIdByName, pickEquipment, pickedForAdd, planTryItems } from "@/features/community/try-workout";
import { readWorkoutSnapshot, type WorkoutSnapshot } from "@/features/community/workout-snapshot";
import { DRAFT_TTL_MS, parseDraft } from "@/features/community/compose-draft";
import { commentAnchor, commentIdFromHash, notificationHref } from "@/features/community/community-notifications";
import { boardHref, mainTabOf, MAIN_TABS } from "@/features/community/feed";
import { feedView } from "@/features/community/feed-page";

/**
 * 커뮤니티 4-1(2026-09-30) — 오늘 이 운동 해보기 · 알림 → 그 댓글 · 글쓰기 임시 저장 · 댓글 단 글.
 * DB(댓글 단 글 보기)는 tests/be/community-4-1.test.ts(라이브 DB, 롤백).
 */

const snap = (exercises: WorkoutSnapshot["exercises"]): WorkoutSnapshot => ({ date: "2026-09-30", durationSec: 1800, exercises });

describe("오늘 이 운동 해보기 — 담을 운동 고르기", () => {
  it("새 글은 운동 id·기구 그대로, 예전 글은 이름(공백 무시)으로 찾는다", () => {
    const items = planTryItems(
      snap([
        { name: "벤치프레스", sets: 5, exerciseId: "bench-press", equipment: "dumbbell" },
        { name: "랫 풀다운", sets: 4 },
      ]),
      new Set(),
    );
    expect(items[0]).toMatchObject({ exerciseId: "bench-press", equipment: "dumbbell", status: "ok" });
    expect(items[1]).toMatchObject({ exerciseId: "lat-pulldown", status: "ok" });
    expect(exerciseIdByName(" 랫풀 다운 ")).toBe("lat-pulldown");
  });
  it("운동 목록에 없는 이름은 담을 수 없고, 오늘 이미 있는 운동·같은 카드의 두 번째는 '이미 있음'", () => {
    const items = planTryItems(
      snap([
        { name: "없는 운동 이름", sets: 3 },
        { name: "벤치프레스", sets: 3, exerciseId: "bench-press" },
        { name: "랫풀다운", sets: 3 },
        { name: "랫풀다운", sets: 2 },
      ]),
      new Set(["bench-press"]),
    );
    expect(items.map((i) => i.status)).toEqual(["unknown", "already", "ok", "already"]);
  });
  it("기구는 그 운동에서 가능한 것만 — 아니면 운동의 첫 기구", () => {
    expect(pickEquipment("bench-press", "machine")).toBe("machine");
    expect(pickEquipment("bench-press", "kettlebell-x")).toBe("barbell");
    expect(pickEquipment("no-such-exercise", "barbell")).toBeNull();
  });
  it("🔴 서버는 고른 번호 중 담을 수 있는 것만 담는다(이미 있음·없는 운동·엉뚱한 번호는 무시)", () => {
    const items = planTryItems(
      snap([
        { name: "벤치프레스", sets: 3, exerciseId: "bench-press", equipment: "barbell" },
        { name: "없는 운동", sets: 3 },
        { name: "랫풀다운", sets: 3 },
      ]),
      new Set(["lat-pulldown"]),
    );
    expect(pickedForAdd(items, [0, 1, 2, 99, -1])).toEqual([{ exerciseId: "bench-press", equipment: "barbell" }]);
  });
  it("스냅샷은 운동 id·기구를 읽되 모양이 이상한 값은 버린다", () => {
    expect(
      readWorkoutSnapshot({ date: "2026-09-30", exercises: [{ name: "벤치프레스", sets: 3, exerciseId: "bench-press", equipment: "barbell" }] })
        ?.exercises[0],
    ).toEqual({ name: "벤치프레스", sets: 3, exerciseId: "bench-press", equipment: "barbell" });
    expect(
      readWorkoutSnapshot({ date: "2026-09-30", exercises: [{ name: "x", sets: 3, exerciseId: "<script>", equipment: 5 }] })?.exercises[0],
    ).toEqual({ name: "x", sets: 3 });
  });
});

describe("알림 → 그 댓글로", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  it("댓글 알림 주소에 댓글 위치(#c-<id>)를 붙인다 — 좋아요·영상은 그대로", () => {
    expect(notificationHref({ kind: "comment", postId: "p1", teachingPostId: null, sourceId: id })).toBe(`/community/p1#c-${id}`);
    expect(notificationHref({ kind: "likes", postId: "p1", teachingPostId: null, sourceId: null })).toBe("/community/p1");
    expect(notificationHref({ kind: "teaching_comment", postId: null, teachingPostId: "t1", sourceId: id })).toBe("/community/reel/t1");
  });
  it("주소 표시 ↔ 댓글 id", () => {
    expect(commentAnchor(id)).toBe(`c-${id}`);
    expect(commentIdFromHash(`#c-${id}`)).toBe(id);
    expect(commentIdFromHash("#c-abc")).toBeNull();
    expect(commentIdFromHash("")).toBeNull();
  });
});

describe("글쓰기 임시 저장", () => {
  const now = 1_790_000_000_000;
  const base = { mode: "question", title: "무릎이 아파요", caption: "", visibility: "public", groupId: null, savedAt: now - 1000 };
  it("7일 안의 초안은 이어 쓸 수 있다", () => {
    expect(parseDraft(JSON.stringify(base), now)).toMatchObject({ mode: "question", title: "무릎이 아파요" });
  });
  it("오래됐거나·비었거나·깨진 초안은 버린다", () => {
    expect(parseDraft(JSON.stringify({ ...base, savedAt: now - DRAFT_TTL_MS - 1 }), now)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...base, title: "  " }), now)).toBeNull();
    expect(parseDraft("{깨짐", now)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...base, mode: "admin" }), now)).toBeNull();
    expect(parseDraft(null, now)).toBeNull();
  });
});

describe("댓글 단 글", () => {
  it("내 글 탭 안의 보기 — 탭 줄은 그대로 다섯", () => {
    expect(mainTabOf("commented")).toBe("mine");
    expect(boardHref("commented")).toBe("/community/mine?view=commented");
    expect(feedView("commented")).toBe("commented");
    expect(MAIN_TABS).toHaveLength(5);
  });
});

const read = (p: string) => readFileSync(p, "utf8");

describe("가드", () => {
  const actions = read("src/features/community/try-workout-actions.ts");
  it("🔴 원칙 2 — 오늘만(daily_plan) 담기만 쓰고 영구 루틴 표는 건드리지 않는다", () => {
    expect(actions).toContain("addExercisesTodayOnlyAction(add)");
    expect(actions).not.toMatch(/from\("routine_exercises"\)|from\("user_routines"\)|\.insert\(|\.update\(|\.upsert\(/);
  });
  it("🔴 담을 운동은 서버가 글의 스냅샷으로 다시 계산한다(앱은 번호만)", () => {
    expect(actions).toContain('.from("community_posts").select("workout_snapshot")');
    expect(actions).toContain("pickedForAdd(items");
  });
  it("공유 카드에 운동 id·기구를 남기고, 이름은 확장 목록까지 찾는다", () => {
    const share = read("src/features/community/workout-share-actions.ts");
    expect(share).toContain("exerciseId: r.exercise_id");
    expect(share).toContain("getCatalogExercise(r.exercise_id)?.name");
  });
  it("댓글 단 글 — 스키마·마이그레이션에 보기와 '내 마지막 댓글 시각' 커서", () => {
    for (const s of [read("supabase/schema.sql"), read("supabase/migrations/202609300005_community_4_1.sql")]) {
      expect(s).toContain("'saved','commented')");
      expect(s).toContain("select max(cm.created_at) from public.community_comments cm where cm.post_id = p.id and cm.user_id = auth.uid()");
    }
  });
});
