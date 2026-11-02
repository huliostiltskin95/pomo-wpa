/* TEMPVS Quiet Focus: settings shared by the PWA and its sync/backup state. */
export const DEFAULT_APPEARANCE = Object.freeze({
  theme: "system",
  density: "normal",
  areaColors: Object.freeze({
    Studio: "#D65B56",
    Lavoro: "#29845C",
    Personale: "#D6A323"
  })
});

const AREAS = Object.keys(DEFAULT_APPEARANCE.areaColors);
const VALID_THEMES = ["system", "light", "dark"];
const VALID_DENSITIES = ["compact", "normal", "comfortable"];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeAppearance(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const colors = source.areaColors && typeof source.areaColors === "object" ? source.areaColors : {};
  const areaColors = {};
  for (const area of AREAS) {
    const candidate = colors[area];
    areaColors[area] = typeof candidate === "string" && COLOR_RE.test(candidate)
      ? candidate.toUpperCase() : DEFAULT_APPEARANCE.areaColors[area];
  }
  return {
    theme: VALID_THEMES.includes(source.theme) ? source.theme : DEFAULT_APPEARANCE.theme,
    density: VALID_DENSITIES.includes(source.density) ? source.density : DEFAULT_APPEARANCE.density,
    areaColors
  };
}

let lastAppearance = DEFAULT_APPEARANCE;
let listening = false;

function resolveTheme() {
  const prefersDark = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return lastAppearance.theme === "system" ? (prefersDark ? "dark" : "light") : lastAppearance.theme;
}

function setTheme() {
  const theme = resolveTheme();
  document.documentElement.dataset.tempoTheme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#111827" : "#F6F8FB");
}

export function applyAppearance(value) {
  lastAppearance = normalizeAppearance(value);
  const root = document.documentElement;
  root.dataset.tempoDensity = lastAppearance.density;
  for (const area of AREAS) {
    root.style.setProperty("--area-" + area.toLowerCase(), lastAppearance.areaColors[area]);
  }
  setTheme();
  if (!listening && typeof window.matchMedia === "function") {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    if (query.addEventListener) query.addEventListener("change", setTheme);
    else if (query.addListener) query.addListener(setTheme);
    listening = true;
  }
  return lastAppearance;
}
