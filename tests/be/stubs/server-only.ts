/**
 * `import "server-only"` 스텁 — Next 빌드에서만 의미가 있는 가드 모듈이라
 * vitest(node) 에서는 해석되지 않는다(`Cannot find package 'server-only'`).
 *
 * 서버 모듈 안의 **순수 로직**(fan-out 묶음, 페이지네이션 등)을 단위테스트하려면
 * 이 스텁으로 갈아끼운다 — vitest.config.ts 의 resolve.alias 참고.
 * 실제 앱 번들에는 영향이 없다(테스트 전용 별칭).
 */
export {};
