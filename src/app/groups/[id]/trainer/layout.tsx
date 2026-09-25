import { redirect } from "next/navigation";
/** Group membership no longer grants trainer access. Historical URLs lead to the independent app. */
export default function LegacyTrainerLayout() { redirect("/trainer"); }