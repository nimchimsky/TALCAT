import { ArrowRight, CheckCircle2, Rocket } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getAdminSnapshot } from "@/lib/admin-data";
import { formatDateTime, formatPercent } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Panell operatiu"
        title="Coordina proves, participants i resultats des d&apos;un sol lloc"
        description="Aquest MVP esta orientat a l&apos;equip intern. Resumeix l&apos;estat de les formes, detecta sessions sensibles i deixa el projecte llest per connectar-se a Railway."
        aside={
          <div className="rounded-[28px] bg-slate-950 p-5 text-white">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              <Rocket className="h-4 w-4" />
              Sortida a produccio
            </div>
            <p className="text-sm leading-6 text-slate-200">
              Base preparada per GitHub + Railway. El pas seguent es activar la
              base de dades i posar autenticacio d&apos;admins.
            </p>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Cataleg de proves"
          description="Versions curtes, cribratge L2 i bateria de validacio."
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
                    <p className="text-sm text-slate-500">{test.slug}</p>
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
                        {test.scoreModel}
                      </p>
                      <p>score model</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Activitat recent"
          description="Traca operativa de canvis, revisions i alerts."
        >
          <div className="space-y-4">
            {snapshot.activity.map((activity) => (
              <div
                key={activity.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {activity.action}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(activity.createdAt)}
                  </p>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {activity.summary}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Actor: {activity.actorEmail}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Sessions i intents"
          description="Seguiment de sessions actives i intents ja puntuats."
        >
          {snapshot.sessions.length === 0 ? (
            <p className="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
              Encara no hi ha sessions reals registrades.
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
          title="Qualitat i scoring"
          description="Vista rapida dels intents que ja entren al reporting."
        >
          {snapshot.attempts.length === 0 ? (
            <p className="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
              Encara no hi ha intents puntuats. El cataleg ja esta carregat i la
              seguent fase es obrir el runner public.
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

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <SectionCard
          title="Checklist de deploy"
          description="Ordre minim per passar a Railway sense sorpreses."
        >
          <ol className="space-y-3">
            {snapshot.deployChecklist.map((item, index) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-[20px] border border-slate-200/80 bg-white/75 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-600">{item}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard
          title="Arquitectura funcional"
          description="El model esta pensat per separar administracio, execucio de prova i analitica."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-white/75 p-4">
              <div className="mb-3 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Backoffice
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Gestio de proves, formes, cohorts, sessions, revisio manual i
                governanca de dades.
              </p>
            </div>
            <div className="rounded-[24px] bg-white/75 p-4">
              <div className="mb-3 flex items-center gap-2 text-sky-700">
                <ArrowRight className="h-4 w-4" />
                Runner public
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Seguent fase: crear el frontend dels participants amb invites
                segures, captura de respostes i scoring automatic.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </>
  );
}
