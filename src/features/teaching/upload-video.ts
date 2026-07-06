import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** 티칭 영상을 teaching-videos 버킷에 올리고 공개 URL을 돌려준다. (브라우저 전용) */
export async function uploadTeachingVideo(file: File): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const ext =
    (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "mp4";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("teaching-videos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "video/mp4",
    });
  if (error) throw new Error(error.message);

  return supabase.storage.from("teaching-videos").getPublicUrl(path).data
    .publicUrl;
}