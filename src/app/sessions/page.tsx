import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getAdminSnapshot } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Sessions"
        title="Monitor d'execucio"
        description="Pensat per detectar incidencies mentre la prova esta viva: dispositiu, horari, expiracions i cues de revisio."
      />

      <SectionCard
        title="Flux actual"
        description="Sessions obertes, tancades i expirades."
      >
        {snapshot.sessions.length === 0 ? (
          <p className="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
            Cap sessio enregistrada encara. Quan s&apos;activi el runner, aquesta
            vista es convertira en el monitor operatiu.
          </p>
        ) : (
          <div className="space-y-4">
            {snapshot.sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/75 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-950">
                      {session.participantCode} - {session.testName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {session.deviceGroup} - inici {formatDateTime(session.startedAt)}
                    </p>
                    {session.endedAt ? (
                      <p className="text-sm text-slate-500">
                        finalitzada {formatDateTime(session.endedAt)}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={session.status} />
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
