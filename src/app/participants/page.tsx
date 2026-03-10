import { redirect } from "next/navigation";

export default function LegacyParticipantsRedirect() {
  redirect("/admin/participants");
}
