import { getStatusTone } from "@/lib/admin-data";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = getStatusTone(status);

  const classes =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "info"
        ? "bg-sky-100 text-sky-700"
        : tone === "warning"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-200 text-slate-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}
