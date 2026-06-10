const TONES: Record<string, string> = {
  good: "text-brand-mid",
  warn: "text-amber-600",
  bad: "text-rose-600",
  neutral: "text-brand-deep",
};

export function Kpi({
  label, value, tone = "neutral", big = false,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "neutral";
  big?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm ${big ? "min-w-[120px]" : "min-w-[78px]"} text-center`}>
      <div className={`font-heading font-semibold leading-none ${big ? "text-[26px]" : "text-xl"} ${TONES[tone]}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
