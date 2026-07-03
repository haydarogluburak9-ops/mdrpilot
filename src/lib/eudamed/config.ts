/** EUDAMED API integration skeleton — configure credentials when available. */

export type EudamedConfig = {
  enabled: boolean;
  baseUrl: string;
  actorId: string | null;
  apiKeyEnv: string;
};

export const EUDAMED_CONFIG: EudamedConfig = {
  enabled: process.env.EUDAMED_API_ENABLED === "true",
  baseUrl: process.env.EUDAMED_API_BASE_URL ?? "https://ec.europa.eu/tools/eudamed/api",
  actorId: process.env.EUDAMED_ACTOR_ID ?? null,
  apiKeyEnv: "EUDAMED_API_KEY",
};

export function eudamedApiStatus(locale: "tr" | "en") {
  const tr = locale === "tr";
  if (!EUDAMED_CONFIG.enabled) {
    return {
      ready: false,
      message: tr
        ? "EUDAMED API devre dışı. Dışa aktarma paketleri kullanılabilir; API için EUDAMED_API_ENABLED=true ayarlayın."
        : "EUDAMED API disabled. Export packages available; set EUDAMED_API_ENABLED=true to enable API.",
    };
  }
  if (!process.env[EUDAMED_CONFIG.apiKeyEnv]) {
    return {
      ready: false,
      message: tr
        ? "API anahtarı eksik (EUDAMED_API_KEY)."
        : "API key missing (EUDAMED_API_KEY).",
    };
  }
  return {
    ready: true,
    message: tr ? "EUDAMED API yapılandırıldı." : "EUDAMED API configured.",
  };
}

/** Placeholder for future UDI device registration via EUDAMED API. */
export async function submitUdiToEudamed(_payload: Record<string, unknown>) {
  const status = eudamedApiStatus("en");
  if (!status.ready) {
    return { ok: false, error: status.message };
  }
  return {
    ok: false,
    error: "EUDAMED API submission not yet implemented — use export packages for manual upload.",
  };
}
