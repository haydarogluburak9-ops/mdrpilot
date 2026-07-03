import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIES, isProtectedPage, isPublicApiPath } from "@/lib/security/policy";

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => Boolean(req.cookies.get(name)?.value));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = hasSessionCookie(req);

  if (pathname.startsWith("/api/")) {
    if (!isPublicApiPath(pathname) && !hasSession) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedPage(pathname) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // NOTE: we intentionally do NOT redirect cookie-bearing users away from
  // /login. The middleware can only see that a cookie exists, not whether the
  // session is still valid. A stale/expired cookie used to trap users on a
  // failing /dashboard with no way to reach /login and re-authenticate.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/demo/tour/:path*",
    "/products/:path*",
    "/technical-file/:path*",
    "/gspr/:path*",
    "/risk/:path*",
    "/clinical/:path*",
    "/pms/:path*",
    "/ifu/:path*",
    "/qms/:path*",
    "/audit/:path*",
    "/audit-simulator/:path*",
    "/consultant/:path*",
    "/executive/:path*",
    "/composer/:path*",
    "/standards/:path*",
    "/wizards/:path*",
    "/files/:path*",
    "/exports/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/activity-log/:path*",
    "/onboarding/:path*",
    "/onboarding",
    "/check-email",
    "/document-register/:path*",
    "/document-control/:path*",
    "/operational/:path*",
    "/evaluation/:path*",
    "/admin/:path*",
    "/admin",
  ],
};
