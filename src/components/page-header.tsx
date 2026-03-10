type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: PageHeaderProps) {
  return (
    <section className="card-surface mb-6 overflow-hidden p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="font-display text-4xl leading-tight text-slate-950">
            {title}
          </h2>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            {description}
          </p>
        </div>
        {aside ? <div className="max-w-sm">{aside}</div> : null}
      </div>
    </section>
  );
}
