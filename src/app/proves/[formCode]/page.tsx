import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import {
  createPublicAttempt,
  getPublicFormByCode,
  getPublicTestSummary,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    formCode: string;
  }>;
};

export default async function PublicFormPage({ params }: Props) {
  const { formCode } = await params;
  const form = await getPublicFormByCode(formCode);

  async function startAttempt(formData: FormData) {
    "use server";

    const attemptId = await createPublicAttempt(formCode, {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
    });

    redirect(`/proves/sessio/${attemptId}`);
  }

  if (!form) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={form.code}
        title={`${form.test.name} - ${form.label}`}
        description={getPublicTestSummary(form.test.estimatedMinutes)}
      />

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold text-slate-950">
            Resum de la prova
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>{form.itemCount} items en total.</p>
            <p>
              {form.wordCount} paraules i {form.pseudowordCount} distractors.
            </p>
            <p>
              Temps orientatiu: {form.test.estimatedMinutes} minuts en un sol
              bloc.
            </p>
          </div>
        </div>

        <form action={startAttempt} className="card-surface p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            Inicia la sessio
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Pots escriure el teu nom o un alias. L&apos;email es opcional i
            nomes serveix per identificar el resultat si l&apos;equip de recerca
            te l&apos;ha demanat.
          </p>

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
            Comenca ara
          </button>
        </form>
      </section>
    </div>
  );
}
