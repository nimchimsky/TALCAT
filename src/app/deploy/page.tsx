import { redirect } from "next/navigation";

export default function LegacyDeployRedirect() {
  redirect("/admin");
}
