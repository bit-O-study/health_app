/**
 * 사진을 캔버스로 축소해 JPEG base64 로 만든다 — AI 비전 업로드 공용(브라우저 전용).
 *
 * NVIDIA NIM 은 인라인 base64 이미지에 크기 제한(≈180KB)이 있어 작게 줄인다
 * (기본 768px·품질 0.7 → 대개 base64 130KB 이하). 음식·기구 식별엔 이 해상도로 충분.
 * 식단(meal-scanner)·기구(equipment-scanner) 스캐너가 함께 쓴다.
 */
export async function resizeImageForAI(
  file: File,
  maxPx = 768,
  quality = 0.7,
): Promise<{ base64: string; mediaType: string; preview: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    fr.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("이미지를 열지 못했습니다."));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리를 지원하지 않는 브라우저입니다.");
  ctx.drawImage(img, 0, 0, w, h);
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  const base64 = jpeg.split(",")[1] ?? "";
  return { base64, mediaType: "image/jpeg", preview: jpeg };
}
