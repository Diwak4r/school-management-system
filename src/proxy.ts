import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight, optimistic guard only. Real authorization is enforced in
 * requirePlatformAdmin() on every server component, action and route handler.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sms_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*"],
};
