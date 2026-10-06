import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { photoUploadPlan } from "./photo-resize";

/**
 * 사진을 긴 변 최대 1600px JPEG 로 줄인다(커뮤니티 2단계).
 * 폰 원본(수 MB)을 그대로 올려 피드가 느려지던 문제. 줄일 필요가 없으면 원본 그대로.
 * 🔴 브라우저가 못 여는 사진(주로 아이폰 HEIC)은 거부 — 올려도 다른 사람 화면에 안 보인다.
 */
async function shrinkPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("이 사진 형식은 열 수 없어요. JPG·PNG 사진으로 올려 주세요.");
  }
  const plan = photoUploadPlan(bitmap.width, bitmap.height, file.size, file.type);
  if (!plan.resize) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, plan.width, plan.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
  return blob ?? file;
}

/** 오운완 인증 사진을 community-photos 버킷에 올리고 공개 URL을 돌려준다. (브라우저 전용) */
export async function uploadCommunityPhoto(file: File): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const body = await shrinkPhoto(file);
  const resized = body !== file;
  const ext = resized
    ? "jpg"
    : (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("community-photos")
    .upload(path, body, {
      cacheControl: "3600",
      upsert: false,
      contentType: resized ? "image/jpeg" : file.type || "image/jpeg",
    });
  if (error) throw new Error(error.message);

  return supabase.storage.from("community-photos").getPublicUrl(path).data
    .publicUrl;
}
