"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { detachPushForLogout } from "@/features/notifications/push-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true); setError("");
    try {
      await detachPushForLogout();
      await signOut();
    } catch {
      setError("로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
      setPending(false);
    }
  }
  return <div>
    <button type="button" disabled={pending} onClick={logout} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted underline-offset-2 hover:underline disabled:opacity-50">
      <LogOut aria-hidden="true" size={16} />{pending ? "로그아웃 중…" : "로그아웃"}
    </button>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
