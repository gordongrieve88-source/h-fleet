"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The wallboard's "live" island: a ticking clock plus a silent
 * router.refresh() every `refreshSeconds`, so the TV always shows the
 * current board without anyone touching it.
 */
export function WallboardLive({ refreshSeconds }: { refreshSeconds: number }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(() => router.refresh(), refreshSeconds * 1000);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [router, refreshSeconds]);

  return (
    <div className="text-right leading-tight">
      <div className="font-heading text-4xl font-semibold tabular-nums">
        {now
          ? now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: "Australia/Sydney" })
          : "--:--"}
      </div>
      <div className="mt-1 text-xs text-white/40">auto-refreshes every {refreshSeconds >= 60 ? `${Math.round(refreshSeconds / 60)} min` : `${refreshSeconds}s`}</div>
    </div>
  );
}
