import { describe, expect, it } from "vitest";
import { groupFailures } from "@/features/commitments/group-pledge";

describe("group failure list", () => {
  it("does not label ongoing, upcoming or successful members as failed", () => {
    expect(groupFailures(["active", "upcoming", "success"].map((status) => ({ userId: status, name: "멤버", title: "다짐", status: status as "active" | "upcoming" | "success" })))).toEqual([]);
  });
  it("combines failures across personal and group pledges for the same account", () => {
    expect(groupFailures([
      { userId: "a", name: "하나", title: "개인", status: "failed" },
      { userId: "a", name: "하나", title: "그룹", status: "failed" },
      { userId: "a", name: "하나", title: "그룹", status: "failed" },
    ])).toEqual([{ userId: "a", name: "하나", titles: ["개인", "그룹"] }]);
  });
  it("keeps members with identical display names separate", () => {
    expect(groupFailures(["a", "b"].map((userId) => ({ userId, name: "같은 이름", title: "다짐", status: "failed" })))).toHaveLength(2);
  });
});
