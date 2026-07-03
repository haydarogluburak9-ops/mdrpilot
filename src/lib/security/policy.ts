import { SESSION_COOKIE_DEFAULT, SESSION_COOKIE_LEGACY } from "@/lib/brand";

/** Session cookie names (current + legacy migration). */
export const SESSION_COOKIES = [SESSION_COOKIE_DEFAULT, SESSION_COOKIE_LEGACY] as const;

/** API routes that may be called without a session cookie. */
export const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/support",
  "/api/sales/request",
] as const;

/** App pages that require a session cookie (middleware redirect to /login). */
export const PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/demo/tour",
  "/products",
  "/technical-file",
  "/gspr",
  "/risk",
  "/clinical",
  "/pms",
  "/ifu",
  "/qms",
  "/audit",
  "/audit-simulator",
  "/consultant",
  "/executive",
  "/composer",
  "/standards",
  "/wizards",
  "/files",
  "/exports",
  "/settings",
  "/billing",
  "/activity-log",
  "/onboarding",
  "/check-email",
  "/document-register",
  "/document-control",
  "/operational",
  "/evaluation",
  "/admin",
] as const;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Demo UI + pre-filled credentials — off in production unless explicitly enabled. */
export function isDemoModeEnabled(): boolean {
  return !isProduction() || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/**
 * Block company-scoped APIs until the user verifies email.
 * Default: required in production; set REQUIRE_EMAIL_VERIFICATION=false to disable.
 */
export function isEmailVerificationRequired(): boolean {
  const flag = process.env.REQUIRE_EMAIL_VERIFICATION;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return isProduction();
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const PAGE_MATCHER = [
  "/api/:path*",
  ...PROTECTED_PAGE_PREFIXES.map((p) => `${p}/:path*`),
  ...PROTECTED_PAGE_PREFIXES,
] as const;
