import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getFullBatteryPlan, startFullBattery } from "@/lib/public-data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    planId: string;
  }>;
  searchParams: Promise<{
    codi?: string;
  }>;
};

export default async function PublicPlanPage({ params, searchParams }: Props) {
  const { planId } = await params;
  const { codi } = await searchParams;

  if (planId !== "completa") {
    notFound();
  }

  const plan = await getFullBatteryPlan(codi);

  if (!plan) {
    notFound();
  }

  async function handleStart(formData: FormData) {
    "use server";

    const result = await startFullBattery({
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      participantCode: String(formData.get("participantCode") ?? ""),
    });

    if (!result.attemptId) {
      redirect(`/resultats?codi=${result.participantCode}`);
    }

    redirect(`/proves/sessio/${result.attemptId}`);
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Bateria"
        title={plan.title}
        description={plan.description}
      />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold text-slate-950">
            Recorregut previst
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{plan.note}</p>

          <div className="mt-5 rounded-[24px] bg-white/80 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-950">
              {plan.estimatedMinutes} minuts aproximadament
            </p>
            <p className="mt-1">
              {plan.completedSteps} de {plan.totalSteps} proves completades
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {plan.steps.map((step, index) => (
              <div
                key={step.formCode}
                className="rounded-[24px] border border-slate-200/80 bg-white/75 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Pas {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  {step.testName} - {step.label}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {step.estimatedMinutes} minuts aproximadament
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {step.completed ? "Ja completada" : "Pendent"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <form action={handleStart} className="card-surface p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            Comenca o repren la bateria
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Si ja tens un codi de participant, el reutilitzarem per continuar
            des del punt on ho vas deixar. Si no, en generarem un de nou.
          </p>

          {plan.participantCode ? (
            <div className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Continuaras amb el codi <strong>{plan.participantCode}</strong>.
            </div>
          ) : null}

          <input
            type="hidden"
            name="participantCode"
            value={plan.participantCode ?? ""}
          />

          <div className="mt-6 grid gap-4">
            <label className="text-sm text-slate-600">
              <span className="mb-2 block font-medium text-slate-950">
                Nom o alias
              </span>
              <input
                name="fullName"
                className="w-full rounded-[20px] border border-slate-200 bg-white/85 px-4 py-3 outline-none"
                placeholder="Escriu el teu nom"
              />
            </label>

            <label className="text-sm text-slate-600">
              <span className="mb-2 block font-medium text-slate-950">
                Email opcional
              </span>
              <input
                type="email"
                name="email"
                className="w-full rounded-[20px] border border-slate-200 bg-white/85 px-4 py-3 outline-none"
                placeholder="tu@exemple.com"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {plan.nextFormCode ? "Comenca la seguent prova" : "Veu els resultats"}
          </button>
        </form>
      </section>
    </div>
  );
}
