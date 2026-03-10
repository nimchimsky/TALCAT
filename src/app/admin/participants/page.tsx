import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getAdminSnapshot } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Participants"
        title="Cohorts i seguiment"
        description="Resum del registre de participants i l'activitat associada."
      />

      <SectionCard
        title="Registre recent"
        description="Cohorts i seguiment de participacio."
      >
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80">
          <table className="min-w-full bg-white/75 text-left text-sm">
            <thead className="bg-slate-100/80 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Codi</th>
                <th className="px-4 py-3 font-medium">Regio</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Assignacions</th>
                <th className="px-4 py-3 font-medium">Complecio</th>
                <th className="px-4 py-3 font-medium">Ultima activitat</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.participants.map((participant) => (
                <tr key={participant.id} className="border-t border-slate-200/80">
                  <td className="px-4 py-4 font-medium text-slate-950">
                    {participant.publicCode}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {participant.homeRegion}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {participant.catalanProfile}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {participant.assignments}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {participant.completionRate}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDateTime(participant.lastSeenAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
