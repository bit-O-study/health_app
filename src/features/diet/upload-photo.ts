import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** 음식 사진을 food-photos 버킷에 업로드하고 공개 URL을 돌려준다. (브라우저 전용) */
export async function uploadFoodPhoto(file: File): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("food-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from("food-photos").getPublicUrl(path).data.publicUrl;
}
