import { redirect } from "next/navigation";

export default function LegacyTestsRedirect() {
  redirect("/admin/tests");
}
