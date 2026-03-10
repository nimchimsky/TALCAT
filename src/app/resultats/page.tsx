import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { formatDateTime, formatPercent } from "@/lib/formatters";
import { getResultSnapshot } from "@/lib/public-data";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    codi?: string;
  }>;
};

export default async function ResultsLookupPage({ searchParams }: Props) {
  const { codi } = await searchParams;
  const snapshot = codi ? await getResultSnapshot(codi) : null;

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Resultats"
        title="Consulta el teu resultat TALCAT"
        description="Introdueix el codi que has rebut al final de la prova per recuperar el teu darrer resultat disponible."
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form action="/resultats" method="get" className="card-surface p-6">
          <label className="block text-sm text-slate-600">
            <span className="mb-2 block font-medium text-slate-950">
              Codi de participant
            </span>
            <input
              name="codi"
              defaultValue={codi}
              placeholder="TALCAT-AB12CD"
              className="w-full rounded-[20px] border border-slate-200 bg-white/85 px-4 py-3 outline-none"
            />
          </label>
          <button
            type="submit"
            className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Cerca el resultat
          </button>
          <Link
            href="/"
            className="mt-4 block text-sm text-slate-500 underline-offset-4 hover:underline"
          >
            Torna a l&apos;inici
          </Link>
        </form>

        <section className="card-surface p-6 sm:p-8">
          {!codi ? (
            <p className="text-sm leading-7 text-slate-600">
              Quan acabis la prova, rebras un codi del tipus
              <span className="font-semibold text-slate-950">
                {" "}
                TALCAT-XXXXXX
              </span>
              . Guarda&apos;l per tornar a entrar aqui.
            </p>
          ) : !snapshot ? (
            <p className="text-sm leading-7 text-slate-600">
              No hem trobat cap resultat per al codi indicat. Revisa&apos;l i
              torna-ho a provar.
            </p>
          ) : !snapshot.latestAttempt ? (
            <p className="text-sm leading-7 text-slate-600">
              El codi existeix, pero encara no hi ha cap intent completat.
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="eyebrow">Codi recuperat</p>
                <h2 className="font-display text-4xl text-slate-950">
                  {snapshot.participantCode}
                </h2>
                {snapshot.participantName ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Participant: {snapshot.participantName}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] bg-white/80 p-4">
                  <p className="text-sm text-slate-500">Precisio</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {formatPercent(snapshot.latestAttempt.accuracy ?? undefined)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/80 p-4">
                  <p className="text-sm text-slate-500">d&apos;</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {snapshot.latestAttempt.dPrime ?? "-"}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/80 p-4">
                  <p className="text-sm text-slate-500">Criteri</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {snapshot.latestAttempt.criterionC ?? "-"}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/80 p-4">
                  <p className="text-sm text-slate-500">Interpretacio</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {snapshot.latestAttempt.proficiencyBand ?? "En process"}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-5">
                <h3 className="text-lg font-semibold text-slate-950">
                  Darrer intent
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {snapshot.latestAttempt.testName} -{" "}
                  {snapshot.latestAttempt.formLabel}
                </p>
                <p className="text-sm leading-7 text-slate-600">
                  Estat: {snapshot.latestAttempt.status}
                  {snapshot.latestAttempt.submittedAt
                    ? ` - enviat ${formatDateTime(snapshot.latestAttempt.submittedAt)}`
                    : ""}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Intent total registrat: {snapshot.attemptsCount}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
