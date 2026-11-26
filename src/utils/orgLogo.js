// Default logos, keyed by Organization.code. The files live in client/public/logos
// (trimmed + resized from the originals in client/public). An organization that
// uploads its own logo (Settings → Organization) uses that instead.
const DEFAULT_LOGOS = {
  ESIAT: "/logos/esiat.png",
  PWWE: "/logos/pwwe.png",
  VMART: "/logos/vmart.png",
  SJI: "/logos/sji.png",
};

export function defaultLogoFor(organizationCode) {
  return DEFAULT_LOGOS[String(organizationCode || "").toUpperCase()] || null;
}
