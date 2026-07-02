import { describe, expect, it } from "vitest";

import {
  aggregateReactions,
  isReactionEmoji,
  REACTION_EMOJIS,
} from "@/features/groups/reactions";

describe("isReactionEmoji", () => {
  it("accepts allowed emojis only", () => {
    expect(isReactionEmoji("🔥")).toBe(true);
    expect(isReactionEmoji("🍕")).toBe(false);
  });
});

describe("aggregateReactions", () => {
  const me = "me";

  it("counts per target and marks mine", () => {
    const rows = [
      { toUser: "a", fromUser: "me", emoji: "🔥" },
      { toUser: "a", fromUser: "x", emoji: "🔥" },
      { toUser: "a", fromUser: "y", emoji: "👍" },
      { toUser: "b", fromUser: "x", emoji: "💪" },
    ];
    const out = aggregateReactions(rows, me);
    const a = out.get("a")!;
    // REACTION_EMOJIS 순서(👍 먼저, 🔥 다음)
    expect(a.map((c) => c.emoji)).toEqual(["👍", "🔥"]);
    const fire = a.find((c) => c.emoji === "🔥")!;
    expect(fire.count).toBe(2);
    expect(fire.mine).toBe(true);
    const thumbs = a.find((c) => c.emoji === "👍")!;
    expect(thumbs.mine).toBe(false);
    expect(out.get("b")!.find((c) => c.emoji === "💪")!.count).toBe(1);
  });

  it("ignores unknown emojis", () => {
    const out = aggregateReactions(
      [{ toUser: "a", fromUser: "x", emoji: "🍕" }],
      me,
    );
    expect(out.has("a")).toBe(false);
  });

  it("keeps emojis in canonical order", () => {
    const rows = REACTION_EMOJIS.map((emoji) => ({
      toUser: "a",
      fromUser: "x",
      emoji,
    }));
    const out = aggregateReactions([...rows].reverse(), me);
    expect(out.get("a")!.map((c) => c.emoji)).toEqual([...REACTION_EMOJIS]);
  });
});
