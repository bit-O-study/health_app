# 디버그(개발/진단) 기능 게이트 규칙

앱에는 개발/진단용 기능(예: 걸음수 진단칩 🩺)이 있다. 이런 기능은 **디버그
계정(= 관리자)** 에게만, 그리고 **관리자 설정에서 켜둔 것만** 보여야 한다.
일반 사용자에겐 절대 노출되지 않는다.

## 🔴 새 디버그 기능을 만들 때 (반드시 이 순서로)

1. **레지스트리에 등록** — `src/features/admin/debug-features.ts` 의
   `DEBUG_FEATURES` 배열에 `{ id, label }` 을 추가한다. `id` 는 짧은 kebab-case,
   `label` 은 관리자 설정 화면에 보일 한글 설명.

2. **노출부를 게이트** — 그 기능을 화면에 그리는 서버 컴포넌트/페이지에서
   `await isDebugFeatureEnabled("<id>")` 로 감싼다. `true` 일 때만 렌더/전달한다.
   (비관리자면 즉시 `false`, 관리자면 `app_settings["debug.<id>"]` 값을 따르되
   미설정이면 기본 켜짐.)

3. 끝. 관리자 설정(`/admin/settings`)의 **"디버그 기능"** 섹션에 온/오프 토글이
   자동으로 생긴다(레지스트리를 순회해서 그림). 관리자는 여기서 기능별로 보고,
   끄고, 다시 켤 수 있다.

## 구성요소

| 위치 | 역할 |
| --- | --- |
| `src/features/admin/debug-features.ts` | 순수 모듈 — `DEBUG_FEATURES` 레지스트리, `debugSettingKey`, `debugValueEnabled`(단위 테스트 대상) |
| `src/features/admin/debug-features.server.ts` | server-only — `isDebugFeatureEnabled(id)`(노출 게이트), `getDebugFeatureStates()`(관리자 설정용 상태맵) |
| `setDebugFeatureAction(id, enabled)` (`admin-actions.ts`) | 기능별 온/오프 저장(관리자만). 끌 때만 `false` 기록, 기본은 켜짐 |
| `DebugFeaturesManager` (`components/debug-features-manager.tsx`) | 관리자 설정의 토글 UI |
| `app_settings` 테이블 (key `debug.<id>`, jsonb value) | 온/오프 저장소. RLS 로 관리자만 read/write |

## 주의

- **디버그 계정 = 관리자.** `isDebugFeatureEnabled` 는 `isAdminUser()`(admins 테이블
  + `is_admin()` SQL 함수)를 먼저 확인한다. 관리자 지정은 `/admin/settings` 상단에서.
- `app_settings` 는 수동 DDL 로 라이브 DB에 이미 적용됨. 스키마 변경 시
  `supabase/schema.sql` + 라이브 DB 둘 다 갱신하고 `pnpm test:schema` 통과 확인.
- 걸음수 진단칩은 위 규칙과 별개로 URL `?stepsdebug=1` 로 누구나 강제로 볼 수 있다
  (일회성 현장 진단용). 코드: `steps-sync.tsx` 의 `refreshDiag()`.

## 등록된 디버그 기능

| id | 설명 | 진입점 | 비고 |
| --- | --- | --- | --- |
| `steps` | 걸음수 진단칩 🩺 | 캘린더 상단 | 네이티브 앱에서만 의미 |
| `equipment-scan` | 기구 사진 분석 📷 (Claude 비전) | 관리자 콘솔 → "기구 분석"(`/equipment`) | `ANTHROPIC_API_KEY` 필요. GA 시 `/equipment` 게이트를 풀고 `/exercises` 로 진입점 이동 |

