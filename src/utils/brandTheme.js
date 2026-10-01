// Per-organization accent + dark-sidebar colors. Each organization picks a
// preset (Organization.brandColor, set under HR Settings → Organization).
// Values are "R G B" triples matching Tailwind's CSS-variable alpha-value
// convention (see tailwind.config.js `brand` and `sidebar`).
//
// 600/700 (buttons, links, the active nav highlight) are accessible accent
// shades — dark enough for white text. 900/800 (the sidebar's background +
// its hover/border) are the 950/900-weight shades of the same hue, dark and
// desaturated enough to keep white nav text readable across a large surface.
const BRAND_COLORS = {
  blue: { 600: "29 78 216", 700: "30 64 175", 900: "15 23 42", 800: "30 41 59" },
  green: { 600: "30 122 52", 700: "22 107 44", 900: "5 46 22", 800: "20 83 45" },
  amber: { 600: "180 83 9", 700: "146 64 14", 900: "69 26 3", 800: "120 53 15" },
  orange: { 600: "234 88 12", 700: "194 65 12", 900: "67 20 7", 800: "124 45 18" },
  purple: { 600: "124 58 237", 700: "109 40 217", 900: "46 16 101", 800: "76 29 149" },
  teal: { 600: "13 148 136", 700: "15 118 110", 900: "4 47 46", 800: "17 94 89" },
  rose: { 600: "225 29 72", 700: "190 18 60", 900: "76 5 25", 800: "136 19 55" },
};

/** Swatch colour for a preset (used by the colour picker). */
export function brandSwatch(name) {
  const c = BRAND_COLORS[name] || BRAND_COLORS.blue;
  return `rgb(${c[600].replaceAll(" ", ",")})`;
}

/** Swap the app's accent + sidebar colors for the signed-in organization's preset. */
export function applyBrandTheme(brandColor) {
  const colors = BRAND_COLORS[brandColor] || BRAND_COLORS.blue;
  const root = document.documentElement.style;
  root.setProperty("--brand-600", colors[600]);
  root.setProperty("--brand-700", colors[700]);
  root.setProperty("--brand-900", colors[900]);
  root.setProperty("--brand-800", colors[800]);
}
