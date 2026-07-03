/** Central brand constants — MDRpilot */

export const BRAND_NAME = "MDRpilot";

export const BRAND_LEGAL_NAME = "MDRpilot";

export const BRAND_DOMAIN = "mdrpilot.com";

export const BRAND_SUPPORT_EMAIL = `support@${BRAND_DOMAIN}`;

export const BRAND_SALES_EMAIL = `sales@${BRAND_DOMAIN}`;

export const BRAND_NOREPLY_EMAIL = `noreply@${BRAND_DOMAIN}`;

export const BRAND_PRIVACY_EMAIL = `privacy@${BRAND_DOMAIN}`;

export const BRAND_META_TITLE = `${BRAND_NAME} — MDR / ISO 13485 Documentation Platform`;

export const BRAND_META_DESCRIPTION =

  "Structure MDR technical files, ISO 13485 QMS and audit-ready dossiers with AI-assisted drafting, GSPR evidence control and gap analysis.";



/** Public logo assets under /public/brand */

export const BRAND_LOGOS = {

  /** Shield mark only — sidebar, favicon, compact UI */

  icon: "/brand/icon.png",

  /** Icon + MDR PILOT wordmark — header, auth */

  logo: "/brand/logo.png",

  /** Full lockup with slogan and certifications — footer, marketing */

  slogan: "/brand/logo-slogan.png",

} as const;



export const STORAGE_KEY_THEME = "mdrpilot-theme";

export const STORAGE_KEY_LANG = "mdrpilot-lang";

export const STORAGE_KEY_THEME_LEGACY = "meddoc-theme";

export const STORAGE_KEY_LANG_LEGACY = "meddoc-lang";

export const SESSION_COOKIE_DEFAULT = "mdrpilot_session";

export const SESSION_COOKIE_LEGACY = "meddoc_session";

