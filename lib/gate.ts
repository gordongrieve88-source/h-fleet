// Shared-password demo gate for the hosted demo (ported from H-Crew). The
// cookie carries an opaque HMAC token derived from the server-side
// GATE_SECRET — nothing password-derived ever reaches the browser, so
// devtools can't leak anything crackable. The cookie is still a bearer token
// (copying it grants access); rotate GATE_SECRET to invalidate every session
// at once.
export const GATE_COOKIE = "hfleet_gate";

export async function gateToken(): Promise<string> {
  const secret = process.env.GATE_SECRET || process.env.DEMO_PASSWORD || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("hfleet-gate-v1"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
