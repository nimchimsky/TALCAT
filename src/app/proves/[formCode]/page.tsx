import { redirect } from "next/navigation";

import {
  createPublicAttempt,
  getPublicFormByCode,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    formCode: string;
  }>;
  searchParams: Promise<{
    codi?: string;
  }>;
};

export default async function PublicFormPage({ params, searchParams }: Props) {
  const { formCode } = await params;
  const { codi } = await searchParams;
  const form = await getPublicFormByCode(formCode);

  async function startAttempt(formData: FormData) {
    "use server";

    const attemptId = await createPublicAttempt(formCode, {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      participantCode: String(formData.get("participantCode") ?? ""),
    });

    redirect(`/proves/sessio/${attemptId}`);
  }

  if (!form) {
    redirect("/");
  }

  return (
    <div className="public-shell">
      <div className="public-frame">
        <section className="public-panel grid gap-6 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div>
              <p className="eyebrow">Abans de comencar</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-[#18261e] sm:text-5xl">
                Llegeix cada element i respon amb naturalitat.
              </h1>
            </div>

            <div className="space-y-3 text-sm leading-7 text-[#55605a]">
              <p>Si el reconeixes com a paraula catalana, prem &quot;Es una paraula&quot;.</p>
              <p>Si et sembla inventat o incorrecte, prem &quot;No es una paraula&quot;.</p>
              <p>No et paris gaire estona en una sola pantalla.</p>
            </div>

            <div className="rounded-[28px] bg-white/72 p-5 text-sm leading-7 text-[#55605a]">
              Temps orientatiu: {form.test.estimatedMinutes} minuts.
            </div>
          </div>

          <form action={startAttempt} className="rounded-[34px] bg-[#1d2e26] p-6 text-white sm:p-8">
            <h2 className="text-2xl font-semibold">Inicia la sessio</h2>
            <p className="mt-2 text-sm leading-7 text-[#d7d3cb]">
              Pots escriure el teu nom o un alias. El codi de participant es
              conservara per continuar mes endavant si cal.
            </p>

            {codi ? (
              <div className="mt-4 rounded-[22px] border border-white/15 bg-white/8 px-4 py-3 text-sm text-[#f4eee4]">
                Continuaras amb el codi <strong>{codi.toUpperCase()}</strong>.
              </div>
            ) : null}

            <input type="hidden" name="participantCode" value={codi ?? ""} />

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
              Comenca ara
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
