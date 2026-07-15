import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { proofMediaTypeFromExt } from "@/features/groups/proof";

/**
 * 인증 움짤(Blob/File)을 group-proofs 버킷에 올리고 { url, mediaType } 을 돌려준다.
 * (브라우저 전용) 3초 무음영상(webm/mp4) 또는 gif.
 */
export async function uploadGroupProof(
  file: Blob,
  ext = "webm",
): Promise<{ url: string; mediaType: "video" | "gif" }> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "webm";
  const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
  const contentType =
    file.type ||
    (safeExt === "gif"
      ? "image/gif"
      : safeExt === "mp4"
        ? "video/mp4"
        : "video/webm");

  const { error } = await supabase.storage
    .from("group-proofs")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType });
  if (error) throw new Error(error.message);

  return {
    url: supabase.storage.from("group-proofs").getPublicUrl(path).data.publicUrl,
    mediaType: proofMediaTypeFromExt(safeExt),
  };
}