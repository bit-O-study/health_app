"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SuspendedLogout() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function logout() {
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="app-press inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-5 text-base font-semibold text-zinc-800 transition disabled:opacity-60 dark:bg-white/[0.08] dark:text-zinc-100"
    >
      <LogOut aria-hidden="true" size={16} />
      로그아웃
    </button>
  );
}
