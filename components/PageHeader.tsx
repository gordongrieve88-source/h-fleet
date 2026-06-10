/**
 * Standard page title block with an optional actions slot.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-xl font-semibold text-brand-deep">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Shared card shell — one source for the content-card look. */
export function Card({
  title,
  count,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  count?: number | string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-card ${className ?? ""}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">
            {title}
            {count != null && <span className="ml-1.5 font-normal text-slate-400">· {count}</span>}
          </span>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
