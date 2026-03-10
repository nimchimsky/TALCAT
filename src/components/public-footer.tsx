import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-[1180px] px-4 pb-8 sm:px-6">
      <div className="flex flex-col gap-4 border-t border-[#22332a]/10 pt-5 text-sm text-[#5f645f] sm:flex-row sm:items-center sm:justify-between">
        <p>TALCAT - Llegeix cada element i respon si es una paraula catalana o no.</p>
        <Link
          href="/admin"
          className="self-start text-xs uppercase tracking-[0.16em] text-[#8b8f88] transition hover:text-[#22332a]"
        >
          Acces investigadors
        </Link>
      </div>
    </footer>
  );
}
