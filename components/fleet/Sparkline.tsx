/**
 * Minimal inline trend line — no chart library, no client JS. Scales to the
 * series' own range with a little headroom so day-to-day movement is
 * visible rather than flattened against 0–100%.
 */
export function Sparkline({
  points,
  format,
  height = 56,
}: {
  points: { label: string; value: number }[];
  format: (v: number) => string;
  height?: number;
}) {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return <p className="text-sm text-slate-500">{format(points[0].value)} on {points[0].label}</p>;
  }

  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.15 || 0.02;
  const min = Math.max(0, lo - pad);
  const max = hi + pad;
  const span = max - min || 1;

  const W = 1000;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => height - ((v - min) / span) * height;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${height} L0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="h-14 w-full"
        role="img"
        aria-label={`Trend from ${format(points[0].value)} on ${points[0].label} to ${format(last.value)} on ${last.label}`}
      >
        <path d={area} fill="currentColor" className="text-brand-mid/10" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" className="text-brand-mid" />
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px] text-slate-400">
        <span>
          {points[0].label} · {format(points[0].value)}
        </span>
        <span>
          {last.label} · {format(last.value)}
        </span>
      </div>
    </div>
  );
}
