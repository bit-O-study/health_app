export const siteConfig = {
  name: "HELTCH",
  title: "HELTCH - 오늘 운동 루틴 자동 추천",
  description:
    "오늘 해야 할 운동을 자동으로 알려주는 헬스 루틴 관리 앱. 분할 루틴, 운동 기록, 체성분 변화를 한곳에서 관리하세요.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function absoluteUrl(path: string) {
  return new URL(path, siteConfig.url).toString();
}
