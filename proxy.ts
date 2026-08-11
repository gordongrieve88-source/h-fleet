import { NextResponse, type NextRequest } from "next/server";
import { authMode, sessionSecretKey, wallboardToken, SESSION_COOKIE, WALLBOARD_COOKIE } from "@/lib/auth/config";
import { openSession } from "@/lib/auth/session";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

/**
 * Sign-in gate (entra mode only; the demo passes straight through). This is
 * the OPTIMISTIC check that redirects signed-out browsers to /auth/login —
 * real authorisation happens server-side in lib/auth on every page and
 * action, so nothing depends on the proxy for safety.
 *
 * Hosted demo: when DEMO_PASSWORD is set, everything (wallboard included)
 * additionally sits behind a shared-password gate (/gate). Locally the
 * variable is unset, so this is a no-op.
 *
 * Wallboard TVs can't do interactive SSO: /wallboard/* accepts a static
 * token instead — open /wallboard/fleet?key=<WALLBOARD_TOKEN> once and the
 * TV keeps a cookie. Rotate the token in the config file to cut old TVs off.
 */

let cachedGateToken: Promise<string> | null = null;

export async function proxy(request: NextRequest) {
  if (process.env.DEMO_PASSWORD && !request.nextUrl.pathname.startsWith("/gate")) {
    cachedGateToken ??= gateToken();
    if (request.cookies.get(GATE_COOKIE)?.value !== (await cachedGateToken)) {
      const url = new URL("/gate", request.url);
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  if (authMode() !== "entra") return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/wallboard")) {
    const token = wallboardToken();
    const presented = request.nextUrl.searchParams.get("key");
    if (token && presented === token) {
      const clean = request.nextUrl.clone();
      clean.searchParams.delete("key");
      const response = NextResponse.redirect(clean);
      response.cookies.set(WALLBOARD_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/wallboard",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }
    if (token && request.cookies.get(WALLBOARD_COOKIE)?.value === token) {
      return NextResponse.next();
    }
    // No valid TV token — fall through to the normal signed-in check.
  }

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (raw && (await openSession(raw, sessionSecretKey()))) return NextResponse.next();

  const login = new URL("/auth/login", request.url);
  login.searchParams.set("returnTo", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the demo gate, the auth flow, the health probe, the BI
  // feed and machine hooks (which carry their own bearer tokens), and static
  // assets.
  matcher: ["/((?!gate|auth/|api/health|api/bi/|api/hooks/|_next/|favicon\\.ico|icon\\.png|logo\\.png).*)"],
};
