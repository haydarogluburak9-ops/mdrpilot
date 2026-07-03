/** Minutes of inactivity before the session ends. Configurable via env on server and client. */
export const SESSION_IDLE_MINUTES = Number(
  process.env.SESSION_IDLE_MINUTES ??
    process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ??
    30,
);

export const SESSION_IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000;

/** Absolute session lifetime from first login, even with activity (default 8 hours). */
export const SESSION_MAX_AGE_HOURS = Number(process.env.SESSION_MAX_AGE_HOURS ?? 8);

export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_HOURS * 60 * 60 * 1000;
