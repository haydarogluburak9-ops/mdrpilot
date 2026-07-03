"use client";

import { useEffect, useRef } from "react";
import { SESSION_IDLE_MS } from "@/lib/auth/session-policy";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function SessionIdleGuard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    function clearTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    async function logoutIdle() {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Still redirect — server session may already be expired.
      }
      window.location.href = "/login?reason=idle";
    }

    async function touchSession() {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_INTERVAL_MS) return;
      lastTouchRef.current = now;
      try {
        const res = await fetch("/api/auth/session-touch", { method: "POST" });
        if (res.status === 401) {
          window.location.href = "/login?reason=idle";
        }
      } catch {
        // Ignore transient network errors; idle timer still applies.
      }
    }

    function resetTimer() {
      clearTimer();
      void touchSession();
      timerRef.current = setTimeout(() => {
        void logoutIdle();
      }, SESSION_IDLE_MS);
    }

    function onActivity() {
      resetTimer();
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resetTimer();
    });

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, []);

  return null;
}
