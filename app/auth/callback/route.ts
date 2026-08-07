import { NextResponse, type NextRequest } from "next/server";
import { authMode, sessionSecretKey, sessionMaxAgeSeconds, LOGIN_STATE_COOKIE, SESSION_COOKIE } from "@/lib/auth/config";
import { openLoginState, sealSession } from "@/lib/auth/session";
import { completeLogin, entraRedirectUri } from "@/lib/auth/entra";

/**
 * GET /auth/callback — Entra redirects here with ?code=&state=. Validate the
 * round trip, mint the session cookie, and land the user where they started.
 */
export async function GET(request: NextRequest) {
  if (authMode() !== "entra") return NextResponse.redirect(new URL("/", request.url));

  const sealed = request.cookies.get(LOGIN_STATE_COOKIE)?.value;
  const loginState = sealed ? await openLoginState(sealed, sessionSecretKey()) : null;
  if (!loginState) {
    // Expired or missing round-trip state — just start over.
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Rebuild the callback URL from the CONFIGURED redirect URI + the actual
  // query string, so token validation never trusts the Host header.
  const callbackUrl = new URL(entraRedirectUri());
  callbackUrl.search = request.nextUrl.search;

  let outcome;
  try {
    outcome = await completeLogin(callbackUrl, loginState);
  } catch (e) {
    console.error("Entra sign-in failed:", e);
    outcome = { ok: false as const, reason: "invalid" as const };
  }

  if (!outcome.ok) {
    const message =
      outcome.reason === "disabled"
        ? "Your H-Fleet account has been deactivated. Contact a manager."
        : "Sign-in failed. Try again, or contact a manager if this keeps happening.";
    const response = new NextResponse(message, { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
    response.cookies.delete(LOGIN_STATE_COOKIE);
    return response;
  }

  const response = NextResponse.redirect(new URL(loginState.returnTo, request.url));
  response.cookies.set(SESSION_COOKIE, await sealSession(outcome.user.id, sessionSecretKey(), sessionMaxAgeSeconds()), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  });
  response.cookies.delete(LOGIN_STATE_COOKIE);
  return response;
}
