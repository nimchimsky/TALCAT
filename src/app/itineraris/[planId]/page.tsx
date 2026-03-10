import { notFound, redirect } from "next/navigation";

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
      age: Number(formData.get("age") ?? NaN),
      selfReportedCatalan: Number(formData.get("selfReportedCatalan") ?? NaN),
      isNative:
        String(formData.get("isNative") ?? "") === "yes"
          ? true
          : String(formData.get("isNative") ?? "") === "no"
            ? false
            : null,
    });

    if (!result.attemptId) {
      redirect(`/resultats?codi=${result.participantCode}`);
    }

    redirect(`/proves/sessio/${result.attemptId}`);
  }

  return (
    <div className="public-shell">
      <div className="public-frame">
        <section className="public-panel grid gap-6 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <div>
              <p className="eyebrow">Instruccions</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-[#18261e] sm:text-5xl">
                Fes la prova seguida i respon sense ajuda.
              </h1>
            </div>

            <div className="space-y-3 text-sm leading-7 text-[#55605a]">
              <p>Veuras una paraula cada vegada.</p>
              <p>Prem si es una paraula catalana o si no ho es.</p>
              <p>No cal que encertis totes les respostes. Nomes continua.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[28px] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7d6a4f]">
                  Durada
                </p>
                <p className="mt-2 text-lg font-semibold text-[#18261e]">
                  {plan.estimatedMinutes} min
                </p>
              </div>
              <div className="rounded-[28px] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7d6a4f]">
                  Ritme
                </p>
                <p className="mt-2 text-lg font-semibold text-[#18261e]">
                  Continu
                </p>
              </div>
              <div className="rounded-[28px] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7d6a4f]">
                  Resposta
                </p>
                <p className="mt-2 text-lg font-semibold text-[#18261e]">
                  Si o no
                </p>
              </div>
            </div>
          </div>

          <form action={handleStart} className="rounded-[34px] bg-[#1d2e26] p-6 text-white sm:p-8">
            <h2 className="text-2xl font-semibold">Identifica&apos;t i comenca</h2>
            <p className="mt-2 text-sm leading-7 text-[#d7d3cb]">
              Si ja tens codi, continuarem des del mateix participant. Si no,
              te&apos;n generarem un automaticament.
            </p>

            {plan.participantCode ? (
              <div className="mt-4 rounded-[22px] border border-white/15 bg-white/8 px-4 py-3 text-sm text-[#f4eee4]">
                Continuaras amb el codi <strong>{plan.participantCode}</strong>.
              </div>
            ) : null}

            <input
              type="hidden"
              name="participantCode"
              value={plan.participantCode ?? ""}
            />

            <div className="mt-6 grid gap-4">
              <label className="text-sm text-[#d7d3cb]">
                <span className="mb-2 block font-medium text-white">
                  Nom o alias
                </span>
                <input
                  name="fullName"
                  className="w-full rounded-[20px] border border-white/12 bg-white/92 px-4 py-3 text-[#18261e] outline-none"
                  placeholder="Escriu el teu nom"
                />
              </label>

              <label className="text-sm text-[#d7d3cb]">
                <span className="mb-2 block font-medium text-white">
                  Edat
                </span>
                <input
                  type="number"
                  name="age"
                  min="12"
                  max="120"
                  className="w-full rounded-[20px] border border-white/12 bg-white/92 px-4 py-3 text-[#18261e] outline-none"
                  placeholder="Ex. 17"
                />
              </label>

              <label className="text-sm text-[#d7d3cb]">
                <span className="mb-2 block font-medium text-white">
                  Nivel de catala (0-10)
                </span>
                <input
                  type="number"
                  name="selfReportedCatalan"
                  min="0"
                  max="10"
                  step="1"
                  className="w-full rounded-[20px] border border-white/12 bg-white/92 px-4 py-3 text-[#18261e] outline-none"
                  placeholder="Ex. 7"
                />
              </label>

              <label className="text-sm text-[#d7d3cb]">
                <span className="mb-2 block font-medium text-white">
                  El catala es llengua inicial?
                </span>
                <select
                  name="isNative"
                  className="w-full rounded-[20px] border border-white/12 bg-white/92 px-4 py-3 text-[#18261e] outline-none"
                  defaultValue=""
                >
                  <option value="">Prefereixo no dir-ho</option>
                  <option value="yes">Si</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label className="text-sm text-[#d7d3cb]">
                <span className="mb-2 block font-medium text-white">
                  Email opcional
                </span>
                <input
                  type="email"
                  name="email"
                  className="w-full rounded-[20px] border border-white/12 bg-white/92 px-4 py-3 text-[#18261e] outline-none"
                  placeholder="tu@exemple.com"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#f6efe4] px-6 py-3 text-sm font-semibold text-[#18261e] transition hover:bg-white"
            >
              {plan.nextFormCode ? "Comenca ara" : "Veu els resultats"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
