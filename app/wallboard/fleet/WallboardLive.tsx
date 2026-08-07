"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/**
 * The wallboard's "live" island: a ticking clock plus a silent
 * router.refresh() every `refreshSeconds`, so the TV always shows the
 * current board without anyone touching it.
 */

// The clock as an external store: one shared 1s ticker, and a null server
// snapshot so SSR/hydration render the placeholder instead of mismatching.
let nowMs: number | null = null;
function subscribeClock(onTick: () => void) {
  nowMs = Date.now();
  const id = setInterval(() => {
    nowMs = Date.now();
    onTick();
  }, 1000);
  return () => clearInterval(id);
}

export function WallboardLive({ refreshSeconds }: { refreshSeconds: number }) {
  const router = useRouter();
  const ms = useSyncExternalStore(
    subscribeClock,
    () => nowMs,
    () => null,
  );

  useEffect(() => {
    const refresh = setInterval(() => router.refresh(), refreshSeconds * 1000);
    return () => clearInterval(refresh);
  }, [router, refreshSeconds]);

  return (
    <div className="text-right leading-tight">
      <div className="font-heading text-4xl font-semibold tabular-nums">
        {ms != null
          ? new Date(ms).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: "Australia/Sydney" })
          : "--:--"}
      </div>
      <div className="mt-1 text-xs text-white/40">auto-refreshes every {refreshSeconds >= 60 ? `${Math.round(refreshSeconds / 60)} min` : `${refreshSeconds}s`}</div>
    </div>
  );
}
