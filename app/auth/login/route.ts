import { NextResponse, type NextRequest } from "next/server";
import { authMode, sessionSecretKey, LOGIN_STATE_COOKIE } from "@/lib/auth/config";
import { sealLoginState } from "@/lib/auth/session";
import { beginLogin } from "@/lib/auth/entra";

/**
 * GET /auth/login[?returnTo=/fleet] — start the Entra sign-in round trip.
 * The state/PKCE/nonce triplet rides in a short-lived signed cookie.
 */
export async function GET(request: NextRequest) {
  if (authMode() !== "entra") return NextResponse.redirect(new URL("/", request.url));

  // Relative paths only — never an absolute URL someone smuggled in.
  const requested = request.nextUrl.searchParams.get("returnTo") ?? "/";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const { url, loginState } = await beginLogin(returnTo);
  const response = NextResponse.redirect(url);
  response.cookies.set(LOGIN_STATE_COOKIE, await sealLoginState(loginState, sessionSecretKey()), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/auth",
    maxAge: 600,
  });
  return response;
}
