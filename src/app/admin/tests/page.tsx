import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getAdminSnapshot } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/formatters";

export const dynamic = "force-dynamic";

function getTestPresentation(status: string) {
  return status === "ACTIVE"
    ? "Prova operativa disponible per al treball de camp."
    : "Prova en preparacio per a una propera onada.";
}

export default async function AdminTestsPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Proves"
        title="Cataleg i versions"
        description="Visio interna de les proves operatives i les seves formes."
      />

      <SectionCard
        title="Inventari de proves"
        description="Estat actual de cada instrument actiu o en preparacio."
      >
        <div className="space-y-4">
          {snapshot.tests.map((test) => (
            <article
              key={test.id}
              className="rounded-[24px] border border-slate-200/80 bg-white/75 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-slate-950">
                      {test.name}
                    </h3>
                    <StatusBadge status={test.status} />
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {getTestPresentation(test.status)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 rounded-[22px] bg-slate-100/80 p-4 text-sm text-slate-600 sm:grid-cols-4">
                  <div>
                    <p className="font-medium text-slate-950">{test.forms}</p>
                    <p>formes</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-950">{test.attempts}</p>
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
                      {formatDateTime(test.updatedAt)}
                    </p>
                    <p>actualitzat</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
