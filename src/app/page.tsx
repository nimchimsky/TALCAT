import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="public-shell">
      <div className="public-frame">
        <section className="public-panel overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="space-y-6">
              <p className="eyebrow">TALCAT</p>
              <h1 className="max-w-3xl font-display text-5xl leading-[0.94] text-[#18261e] sm:text-6xl lg:text-7xl">
                Decideix si el que veus es una paraula catalana o no.
              </h1>
              <p className="max-w-xl text-base leading-8 text-[#55605a] sm:text-lg">
                Respon de manera natural, sense buscar ajuda externa. El test et
                guiara pas a pas.
              </p>

              <div className="flex flex-wrap gap-3 text-sm text-[#22332a]">
                <div className="instruction-chip">6 a 8 minuts</div>
                <div className="instruction-chip">Una sola passada</div>
                <div className="instruction-chip">Sense pauses llargues</div>
              </div>
            </div>

            <div className="rounded-[34px] bg-[#1d2e26] p-6 text-[#f7f3ec] sm:p-8">
              <p className="eyebrow text-[#e8b06a]">Abans de comencar</p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[#d7d3cb]">
                <p>Fes la prova en un lloc tranquil.</p>
                <p>Respon tan aviat com ho tinguis clar.</p>
                <p>Si dubtes, tria l&apos;opcio que et sembli millor i continua.</p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/itineraris/completa"
                  className="inline-flex items-center justify-center rounded-full bg-[#f6efe4] px-6 py-3 text-sm font-semibold text-[#18261e] transition hover:bg-white"
                >
                  Comenca el test
                </Link>
                <Link
                  href="/resultats"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
                >
                  Ja tinc codi
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
