import { NextResponse, type NextRequest } from "next/server";
import { authMode, sessionSecretKey, wallboardToken, SESSION_COOKIE, WALLBOARD_COOKIE } from "@/lib/auth/config";
import { openSession } from "@/lib/auth/session";

/**
 * Sign-in gate (entra mode only; the demo passes straight through). This is
 * the OPTIMISTIC check that redirects signed-out browsers to /auth/login —
 * real authorisation happens server-side in lib/auth on every page and
 * action, so nothing depends on the proxy for safety.
 *
 * Wallboard TVs can't do interactive SSO: /wallboard/* accepts a static
 * token instead — open /wallboard/fleet?key=<WALLBOARD_TOKEN> once and the
 * TV keeps a cookie. Rotate the token in the config file to cut old TVs off.
 */
export async function proxy(request: NextRequest) {
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
  // Everything except the auth flow, the health probe, the BI feed (which
  // carries its own bearer token), and static assets.
  matcher: ["/((?!auth/|api/health|api/bi/|_next/|favicon\\.ico|icon\\.png|logo\\.png).*)"],
};
