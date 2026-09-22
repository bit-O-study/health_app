export type AppId = "launcher" | "workout" | "diet" | "calendar" | "groups" | "community" | "coach" | "pet";
export type LauncherApp = { id: AppId; name: string; href: string; icon: string; color: string };
export const APPS: readonly LauncherApp[] = [
  { id: "workout", name: "운동", href: "/routine", icon: "Flame", color: "from-[#f08a72] to-[#cf4b34]" },
  { id: "diet", name: "식단", href: "/diet", icon: "Salad", color: "from-[#6cc08c] to-[#1f8b52]" },
  { id: "calendar", name: "캘린더", href: "/calendar", icon: "CalendarDays", color: "from-[#79aef0] to-[#2a63bd]" },
  { id: "groups", name: "그룹", href: "/groups", icon: "UsersRound", color: "from-[#efc06d] to-[#c28a1d]" },
  { id: "community", name: "커뮤니티", href: "/community", icon: "Newspaper", color: "from-[#ab8ce8] to-[#6f45bb]" },
  { id: "coach", name: "헬쑤쌤", href: "/coach", icon: "GraduationCap", color: "from-[#5cc0c4] to-[#1a838a]" },
  { id: "pet", name: "펫", href: "/pet", icon: "PawPrint", color: "from-[#ee9bbb] to-[#bd4f7f]" },
  { id: "launcher", name: "전체 앱", href: "/home", icon: "LayoutGrid", color: "from-[#7b9085] to-[#435f50]" },
];
export function launcherApps(showCoach: boolean) {
  return APPS.filter(app => app.id !== "launcher" && (showCoach || app.id !== "coach"));
}
