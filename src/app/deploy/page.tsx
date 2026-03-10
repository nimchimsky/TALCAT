import { CheckCircle2, GitBranch, ServerCog } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getAdminSnapshot } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const envVars = [
  {
    key: "DATABASE_URL",
    value: "Connexio Prisma cap a Railway PostgreSQL",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    value: "URL publica de l'app",
  },
  {
    key: "APP_NAME",
    value: "Nom visible a la UI i metadades",
  },
];

export default async function DeployPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Deploy"
        title="Preparacio per Railway i GitHub"
        description="Aquesta base ja porta healthcheck, Prisma, seed, fitxer de Railway i workflow de CI per validar cada push."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Flux recomanat"
          description="Ordre pragmatic per posar-ho online."
        >
          <ol className="space-y-3">
            {snapshot.deployChecklist.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-[22px] border border-slate-200/80 bg-white/75 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-600">{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard
          title="Variables d'entorn"
          description="Minim viable per arrencar local i a Railway."
        >
          <div className="space-y-3">
            {envVars.map((envVar) => (
              <div
                key={envVar.key}
                className="rounded-[22px] border border-slate-200/80 bg-white/75 p-4"
              >
                <p className="font-mono text-sm font-semibold text-slate-950">
                  {envVar.key}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {envVar.value}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-sky-700">
            <GitBranch className="h-4 w-4" />
            GitHub
          </div>
          <p className="text-sm leading-6 text-slate-600">
            El workflow `CI` fa `npm ci`, `prisma generate`, `lint` i `build`
            a cada push i pull request.
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-700">
            <ServerCog className="h-4 w-4" />
            Railway
          </div>
          <p className="text-sm leading-6 text-slate-600">
            `railway.json` publica l&apos;app amb healthcheck a `/api/health` i
            reinici en cas de fallada.
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-amber-700">
            <CheckCircle2 className="h-4 w-4" />
            Prisma
          </div>
          <p className="text-sm leading-6 text-slate-600">
            El model deixa resolts proves, participants, intents, respostes i
            auditoria de backoffice.
          </p>
        </div>
      </section>
    </>
  );
}
