import type { Lang } from "@/lib/i18n/locales";
import de from "./locale-packs/de.json";
import fr from "./locale-packs/fr.json";
import es from "./locale-packs/es.json";
import it from "./locale-packs/it.json";
import nl from "./locale-packs/nl.json";

/** Public-facing UI strings for DE/FR/ES/IT/NL (landing, auth, help, billing). */
export const PUBLIC_LOCALE_TRANSLATIONS: Partial<Record<Exclude<Lang, "en" | "tr">, Record<string, string>>> = {
  de,
  fr,
  es,
  it,
  nl,
};
