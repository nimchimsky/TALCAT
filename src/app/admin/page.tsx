import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getAdminSnapshot } from "@/lib/admin-data";
import { formatDateTime, formatPercent } from "@/lib/formatters";

export const dynamic = "force-dynamic";

function getTestStageLabel(status: string) {
  return status === "ACTIVE"
    ? "Disponible per al treball de camp."
    : "En preparacio per a una fase posterior.";
}

function getActivityLabel(action: string) {
  switch (action) {
    case "catalog.imported":
      return "Cataleg actualitzat";
    case "attempt.started":
      return "Sessio iniciada";
    case "result.reviewed":
      return "Resultat revisat";
    case "session.flagged":
      return "Sessio revisada";
    case "test.activated":
      return "Prova activada";
    default:
      return "Activitat registrada";
  }
}

function getActivitySummary(action: string, summary: string) {
  if (action === "catalog.imported") {
    return "S'ha actualitzat el cataleg operatiu amb les formes disponibles.";
  }

  return summary;
}

export default async function AdminDashboardPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Panell de seguiment TALCAT"
        description="Vista interna per al seguiment de proves, participants, sessions i resultats de camp."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Cataleg actiu"
          description="Proves i formes actualment disponibles."
        >
          <div className="space-y-4">
            {snapshot.tests.map((test) => (
              <article
                key={test.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-950">
                        {test.name}
                      </h4>
                      <StatusBadge status={test.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {getTestStageLabel(test.status)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="font-medium text-slate-950">{test.forms}</p>
                      <p>formes</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">
                        {test.attempts}
                      </p>
                      <p>intents</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">
                        {test.estimatedMinutes} min
                      </p>
                      <p>durada</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-950">
                        online
                      </p>
                      <p>modalitat</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Activitat recent"
          description="Events de recerca registrats a la plataforma."
        >
          <div className="space-y-4">
            {snapshot.activity.map((activity) => (
              <div
                key={activity.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {getActivityLabel(activity.action)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(activity.createdAt)}
                  </p>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {getActivitySummary(activity.action, activity.summary)}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Registre intern
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Sessions recents"
          description="Sessions vives o tancades durant el treball de camp."
        >
          {snapshot.sessions.length === 0 ? (
            <p className="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
              Encara no hi ha sessions registrades.
            </p>
          ) : (
            <div className="space-y-3">
              {snapshot.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {session.participantCode} - {session.testName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {session.deviceGroup} - inici {formatDateTime(session.startedAt)}
                    </p>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Resultats recents"
          description="Darrers intents puntuats o en revisio."
        >
          {snapshot.attempts.length === 0 ? (
            <p className="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
              Encara no hi ha intents puntuats.
            </p>
          ) : (
            <div className="space-y-3">
              {snapshot.attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-[22px] border border-slate-200/80 bg-white/75 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-950">
                        {attempt.participantCode} - {attempt.testName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        accuracy {formatPercent(attempt.accuracy)} - d&apos;{" "}
                        {attempt.dPrime ?? "Sense valor"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {attempt.score ? (
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                          score {attempt.score}
                        </span>
                      ) : null}
                      <StatusBadge status={attempt.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </>
  );
}
