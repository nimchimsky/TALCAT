import { redirect } from "next/navigation";

export default function LegacySessionsRedirect() {
  redirect("/admin/sessions");
}
