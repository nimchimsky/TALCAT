import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getAdminSnapshot } from "@/lib/admin-data";
import { formatDateTime, formatPercent } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Resultats"
        title="Scoring i revisio"
        description="Lectura interna dels intents puntuats i dels casos que necessiten revisio."
      />

      <SectionCard
        title="Intents recents"
        description="Resultats disponibles per a seguiment intern."
      >
        {snapshot.attempts.length === 0 ? (
          <p className="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
            Encara no hi ha resultats reals.
          </p>
        ) : (
          <div className="space-y-4">
            {snapshot.attempts.map((attempt) => (
              <article
                key={attempt.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/75 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">
                        {attempt.participantCode} - {attempt.testName}
                      </h3>
                      <StatusBadge status={attempt.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Accuracy {formatPercent(attempt.accuracy)} - d&apos;{" "}
                      {attempt.dPrime ?? "Sense valor"}
                      {attempt.submittedAt
                        ? ` - enviat ${formatDateTime(attempt.submittedAt)}`
                        : ""}
                    </p>
                  </div>

                  <div className="rounded-[22px] bg-slate-100/80 px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-950">
                      {attempt.score ?? "pendent"}
                    </p>
                    <p>score</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
