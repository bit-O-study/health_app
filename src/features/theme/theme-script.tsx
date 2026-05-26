import { THEME_STORAGE_KEY } from "@/features/theme/theme";

/**
 * 페인트 전에 실행되는 인라인 스크립트. localStorage 의 선택값을 읽어`<html>` 에
 * 미리 .dark 를 붙여 두면 초기 로드 시 라이트→다크 깜빡임(flash of light)이 사라진다.
 *`next/script` 의 beforeInteractive 와 달리 Server Component 의 <head> 에 직접 박혀
 * React hydration 보다 먼저 실행된다.
 */
export function ThemeScript() {
  const code = `
 (function() {
 try {
 var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
 var choice = stored ==="dark" || stored ==="light" || stored ==="system" ? stored :"dark";
 var dark = choice ==="dark" || (choice ==="system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
 if (dark) document.documentElement.classList.add("dark");
 else document.documentElement.classList.remove("dark");
} catch (e) {
 document.documentElement.classList.add("dark");
}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
