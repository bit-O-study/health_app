/**
 * 오늘 운동 인증(움짤) 순수 로직 — server-only 없음(단위 테스트 가능).
 * DB/브라우저 접근이 필요한 부분은 proof-data.ts / upload-proof.ts 에 있다.
 */

export type ProofMediaType = "video" | "gif";

/** 확장자 → media_type(표시 방식). gif 만 정적 이미지, 나머지는 무음 루프 영상. */
export function proofMediaTypeFromExt(ext: string): ProofMediaType {
  return ext.trim().toLowerCase().replace(/^\./, "") === "gif" ? "gif" : "video";
}

/** 저장된 media_type 문자열을 안전하게 해석(그 외/미설정 = 'video'). */
export function normalizeProofMediaType(v: unknown): ProofMediaType {
  return v === "gif" ? "gif" : "video";
}

/** 정렬용 최소 정보 — 인증 시각(없으면 미인증), 본인 여부, 이름. */
export type ProofOrderable = {
  name: string;
  isMe: boolean;
  proofCreatedAt: string | null;
};

/**
 * 인증 피드 정렬 비교자 —
 *  1) 인증한 사람이 미인증보다 앞
 *  2) 인증한 사람끼리는 최신 인증 우선
 *  3) 미인증끼리는 본인 우선, 그다음 이름(가나다)
 */
export function compareProofOrder(a: ProofOrderable, b: ProofOrderable): number {
  const ap = a.proofCreatedAt ? 1 : 0;
  const bp = b.proofCreatedAt ? 1 : 0;
  if (ap !== bp) return bp - ap;
  if (a.proofCreatedAt && b.proofCreatedAt) {
    return b.proofCreatedAt.localeCompare(a.proofCreatedAt);
  }
  if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
  return a.name.localeCompare(b.name, "ko");
}