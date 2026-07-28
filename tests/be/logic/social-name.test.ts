import { describe, expect, it } from "vitest";

import {
  shouldFillProfileName,
  socialNameFromMetadata,
  socialNicknameFromMetadata,
  socialProfilePatch,
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

describe("socialNicknameFromMetadata — 초기 닉네임", () => {
  it("가입폼에서 받은 닉네임이 있으면 그것", () => {
    expect(
      socialNicknameFromMetadata({ name: "홍길동", nickname: "길동이" }),
    ).toBe("길동이");
  });

  it("소셜은 닉네임을 안 받으므로 이름과 같은 값", () => {
    expect(socialNicknameFromMetadata({ full_name: "김철수" })).toBe("김철수");
    expect(
      socialNicknameFromMetadata({
        kakao_account: { profile: { nickname: "헬쑤짱" } },
      }),
    ).toBe("헬쑤짱");
  });

  it("닉네임은 20자까지", () => {
    expect(socialNicknameFromMetadata({ name: "가".repeat(30) })).toHaveLength(
      20,
    );
  });

  it("이름이 없으면 null", () => {
    expect(socialNicknameFromMetadata({ avatar_url: "x" })).toBeNull();
  });
});

describe("socialProfilePatch — 빈 칸만 채운다", () => {
  it("소셜 최초 가입: 이름·닉네임 둘 다 채운다", () => {
    expect(
      socialProfilePatch({ full_name: "김철수" }, { name: null, nickname: null }),
    ).toEqual({ name: "김철수", nickname: "김철수" });
  });

  it("이미 정한 닉네임은 덮지 않는다", () => {
    expect(
      socialProfilePatch(
        { full_name: "김철수" },
        { name: null, nickname: "쇠질러" },
      ),
    ).toEqual({ name: "김철수" });
  });

  it("이름·닉네임 둘 다 있으면 아무것도 안 바꾼다", () => {
    expect(
      socialProfilePatch(
        { full_name: "김철수" },
        { name: "김철수", nickname: "쇠질러" },
      ),
    ).toEqual({});
  });

  it("메타데이터에 이름이 없으면 아무것도 안 바꾼다", () => {
    expect(
      socialProfilePatch({ avatar_url: "x" }, { name: null, nickname: null }),
    ).toEqual({});
  });

  it("이메일 가입(이름+닉네임 따로)은 각각 그대로 들어간다", () => {
    expect(
      socialProfilePatch(
        { name: "홍길동", nickname: "길동이" },
        { name: null, nickname: null },
      ),
    ).toEqual({ name: "홍길동", nickname: "길동이" });
  });
});