import { describe, expect, it } from "vitest";

import {
  shouldFillProfileName,
  socialNameFromMetadata,
} from "@/features/auth/social-name";

describe("socialNameFromMetadata", () => {
  it("이메일 가입(name 직접 저장)", () => {
    expect(socialNameFromMetadata({ name: "홍길동", phone: "01012345678" })).toBe(
      "홍길동",
    );
  });

  it("구글 — full_name/name", () => {
    expect(
      socialNameFromMetadata({
        full_name: "김철수",
        avatar_url: "https://x/y.png",
        email: "a@b.com",
      }),
    ).toBe("김철수");
  });

  it("구글 — given_name/family_name 만 있으면 성+이름", () => {
    expect(
      socialNameFromMetadata({ given_name: "철수", family_name: "김" }),
    ).toBe("김철수");
  });

  it("카카오 — 중첩 kakao_account.profile.nickname", () => {
    expect(
      socialNameFromMetadata({
        kakao_account: { profile: { nickname: "헬쑤짱" } },
      }),
    ).toBe("헬쑤짱");
  });

  it("카카오 — properties.nickname 폴백", () => {
    expect(socialNameFromMetadata({ properties: { nickname: "근육맨" } })).toBe(
      "근육맨",
    );
  });

  it("이메일 문자열은 이름으로 쓰지 않는다", () => {
    expect(socialNameFromMetadata({ name: "a@b.com" })).toBeNull();
    expect(
      socialNameFromMetadata({ name: "a@b.com", full_name: "이영희" }),
    ).toBe("이영희");
  });

  it("이름이 없으면 null", () => {
    expect(socialNameFromMetadata({ avatar_url: "x" })).toBeNull();
    expect(socialNameFromMetadata({ name: "   " })).toBeNull();
    expect(socialNameFromMetadata(null)).toBeNull();
    expect(socialNameFromMetadata(undefined)).toBeNull();
  });

  it("너무 긴 이름은 40자로 자른다", () => {
    expect(socialNameFromMetadata({ name: "가".repeat(60) })).toHaveLength(40);
  });
});

describe("shouldFillProfileName", () => {
  it("비어 있을 때만 채운다(기존 이름은 덮지 않는다)", () => {
    expect(shouldFillProfileName(null)).toBe(true);
    expect(shouldFillProfileName("")).toBe(true);
    expect(shouldFillProfileName("  ")).toBe(true);
    expect(shouldFillProfileName("홍길동")).toBe(false);
  });
});