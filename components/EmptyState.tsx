/**
 * Friendly "nothing here" placeholder — circled icon, one-line message,
 * optional hint. Keeps empty states consistent and clearly intentional.
 */
export function EmptyState({
  icon = "✓",
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-sand/70 text-base text-slate-500"
      >
        {icon}
      </span>
      <p className="mt-2 text-sm font-medium text-slate-500">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
