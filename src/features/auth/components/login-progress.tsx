import { LogoMark } from "@/features/brand/logo";

export function LoginProgress() {
  return (
    <section data-testid="login-progress" role="status" aria-label="화면 준비 중" aria-busy="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-white dark:bg-zinc-950">
      <LogoMark size={52} />
    </section>
  );
}
