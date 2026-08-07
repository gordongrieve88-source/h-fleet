import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/config";

/** POST /auth/logout — drop the session cookie. (POST so a stray link
 *  prefetch can never sign someone out.) */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
