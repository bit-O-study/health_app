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
      className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-60"
    >
      <LogOut aria-hidden="true" size={16} />
      로그아웃
    </button>
  );
}
