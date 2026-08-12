import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { biApiToken } from "@/lib/auth/config";

/**
 * Bearer-token gate for the BI feed. Length-independent constant-time
 * comparison so a wrong token can't be probed byte by byte.
 */

function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still burn a comparison so timing doesn't reveal the length.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Returns a 401/503 response when the request may NOT read the feed. */
export function denyBiRequest(request: NextRequest): NextResponse | null {
  const expected = biApiToken();
  if (!expected) {
    return NextResponse.json(
      { error: "The BI feed is disabled. Set BI_API_TOKEN (24+ chars) to enable it." },
      { status: 503 },
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!presented || !tokenMatches(presented, expected)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401, headers: { "www-authenticate": "Bearer" } });
  }
  return null;
}
