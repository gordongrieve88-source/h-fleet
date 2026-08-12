/**
 * Outbound push to the RMX Portal (allocator hub): every board change a
 * dispatcher makes lands in the allocators' "Fleet changes" inbox on their
 * day page, so nothing said here has to be repeated on the phone.
 *
 *   RMX_PUSH_URL   e.g. https://rmx-portal-demo.azurewebsites.net/api/hooks/fleet
 *   RMX_PUSH_TOKEN shared bearer token (FLEET_HOOK_TOKEN on the RMX side)
 *
 * Off entirely until both are configured — the default, like every other
 * connector. Fire-and-forget: the allocators' inbox must never be able to
 * fail a dispatcher's edit, so errors are logged and swallowed.
 */

export interface RosterChangeEvent {
  truck: string;
  summary: string;
  status?: string;
  time?: string;
}

export function rmxPushConfigured(): boolean {
  const url = process.env.RMX_PUSH_URL?.trim();
  const token = process.env.RMX_PUSH_TOKEN?.trim();
  return !!url && !!token && token.length >= 16;
}

export async function pushRosterChanges(dateKey: string, events: RosterChangeEvent[]): Promise<void> {
  if (!rmxPushConfigured() || events.length === 0) return;
  try {
    const res = await fetch(process.env.RMX_PUSH_URL!.trim(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RMX_PUSH_TOKEN!.trim()}`,
      },
      body: JSON.stringify({ dateKey, events }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.warn(`RMX push: ${res.status} for ${events.length} event(s) on ${dateKey}`);
  } catch (e) {
    console.warn(`RMX push failed (${events.length} event(s) on ${dateKey}): ${String(e).slice(0, 120)}`);
  }
}
