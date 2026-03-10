import Link from "next/link";

import { getPublicHomeData } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getPublicHomeData();

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-10">
      <section className="card-surface overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <p className="eyebrow">TALCAT</p>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-tight text-slate-950 sm:text-6xl">
                Fes la prova i consulta el teu resultat
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                TALCAT es una prova breu de reconeixement lexical en catala.
                Tria la forma que t&apos;indiqui l&apos;equip de recerca, respon
                cada item i al final rebras un codi per recuperar el resultat.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/75 p-5">
                <p className="text-sm font-medium text-slate-500">Durada</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  8 minuts
                </p>
              </div>
              <div className="rounded-[24px] bg-white/75 p-5">
                <p className="text-sm font-medium text-slate-500">Format</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  Paraula o no
                </p>
              </div>
              <div className="rounded-[24px] bg-white/75 p-5">
                <p className="text-sm font-medium text-slate-500">Acces</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  Online
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-950 p-6 text-white">
            <p className="eyebrow text-amber-300">Abans de comencar</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
              <p>1. Busca un espai tranquil i fes la prova d&apos;una sola tirada.</p>
              <p>2. Decideix si cada item es una paraula valida en catala o no.</p>
              <p>3. Guarda el codi final per tornar a consultar el resultat.</p>
            </div>

            <form
              action="/resultats"
              method="get"
              className="mt-8 rounded-[24px] bg-white/10 p-4"
            >
              <label
                htmlFor="codi"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300"
              >
                Ja tens un codi?
              </label>
              <input
                id="codi"
                name="codi"
                placeholder="Ex. TALCAT-AB12CD"
                className="w-full rounded-2xl border border-white/15 bg-white/90 px-4 py-3 text-sm text-slate-950 outline-none ring-0"
              />
              <button
                type="submit"
                className="mt-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Consulta el resultat
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Proves disponibles</p>
            <h2 className="font-display text-3xl text-slate-950">
              Tria la forma que has de completar
            </h2>
          </div>
        </div>

        <div className="grid gap-6">
          {data.tests.map((test) => (
            <article key={test.id} className="card-surface p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <h3 className="text-2xl font-semibold text-slate-950">
                    {test.name}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">
                    {test.description}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/75 px-5 py-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-950">
                    {test.estimatedMinutes} minuts aproximadament
                  </p>
                  <p>Completament online</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {test.forms.map((form) => (
                  <div
                    key={form.code}
                    className="rounded-[28px] border border-slate-200/80 bg-white/75 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {form.code}
                        </p>
                        <h4 className="mt-2 text-xl font-semibold text-slate-950">
                          {form.label}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {form.description}
                        </p>
                      </div>
                      <div className="rounded-[20px] bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        <p className="font-medium text-slate-950">
                          {form.itemCount} items
                        </p>
                        <p>
                          {form.wordCount} paraules · {form.pseudowordCount} no
                          paraules
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/proves/${form.code}`}
                      className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Comenca aquesta prova
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
