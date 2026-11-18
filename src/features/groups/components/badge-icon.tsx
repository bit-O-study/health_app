import { BoltIcon, GemIcon, KcalIcon, TrophyIcon } from "@/components/icons/app-icons";
import type { Badge } from "../streak";

/** 연속 기록 배지 — 이모지 대신 직접 그린 단색 아이콘. 색은 둘러싼 글자색을 따른다. */
export function BadgeIcon({ icon }: { icon?: Badge["icon"] }) {
  const Cmp = icon === "bolt" ? BoltIcon : icon === "gem" ? GemIcon : icon === "trophy" ? TrophyIcon : KcalIcon;
  return <Cmp size={13} />;
}
