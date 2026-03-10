type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="card-surface p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-4 font-display text-4xl text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
