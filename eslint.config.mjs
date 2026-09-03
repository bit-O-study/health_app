import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // ── 빌드 산출물은 어디에 있든 검사하지 않는다 ───────────────────────────
    // 위의 기본 목록은 **레포 루트에만** 걸린다. 하위 폴더의 산출물이 그대로 검사
    // 대상이 되면서 `pnpm lint` 가 11,367건(에러 444)을 뱉었고, 그중 11,286건이
    // 산출물이었다 — 실제 소스 문제가 묻혀서 CI 게이트를 걸 수가 없었다.
    "**/.next/**",
    "**/out/**",
    "**/dist/**",
    "**/build/**",
    "**/node_modules/**",

    // 성능 보고서 사이트 — .gitignore 에도 있는 산출물(자체 .next/dist/out 포함).
    // 전체 문제의 대부분(에러 415 · 경고 10,871)이 여기서 나왔다.
    "performance-report-site/**",

    // Capacitor/Gradle 산출물 — native-bridge.js 등 생성 파일.
    "android/app/build/**",
    "android/**/build/**",
    // cap sync 가 웹 자산을 복사해 넣는 곳(원본은 public/·.next/ 에 있다).
    "android/app/src/main/assets/public/**",

    // Playwright 실행 산출물.
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
