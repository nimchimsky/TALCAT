import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1180px] px-4 pb-8 sm:px-6">
      <div className="flex flex-col gap-4 border-t border-slate-300/70 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>TALCAT - Prova online de reconeixement lexical en catala per a recerca.</p>
        <Link
          href="/admin"
          className="self-start text-xs uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-700"
        >
          Acces investigadors
        </Link>
      </div>
    </footer>
  );
}
