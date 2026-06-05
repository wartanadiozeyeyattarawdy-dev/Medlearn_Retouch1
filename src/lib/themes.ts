export type Theme = {
  id: string;
  name: string;
  emoji: string;
  swatches: string[]; // 3 hex/oklch for preview chips
};

export const THEMES: Theme[] = [
  { id: "duo-green",    name: "Duolingo Green",  emoji: "🦉", swatches: ["#58cc02", "#1cb0f6", "#ffc800"] },
  { id: "midnight",     name: "Midnight Indigo", emoji: "🌌", swatches: ["#4f46e5", "#0a0a1a", "#a78bfa"] },
  { id: "noir-gold",    name: "Noir & Or",       emoji: "✨", swatches: ["#c9a84c", "#0d0d0d", "#f0d78c"] },
  { id: "ocean",        name: "Océan Profond",   emoji: "🌊", swatches: ["#2d8a9e", "#0c2340", "#5cbdb9"] },
  { id: "sunset",       name: "Coucher Soleil",  emoji: "🌅", swatches: ["#ff6b35", "#f7931e", "#e84393"] },
  { id: "blossom",      name: "Cerisier",        emoji: "🌸", swatches: ["#e88aab", "#c45c7c", "#f8c8d8"] },
  { id: "forest",       name: "Forêt Mousse",    emoji: "🌲", swatches: ["#2d5a3d", "#5a8a5c", "#a0c49d"] },
  { id: "coral",        name: "Corail Électrique", emoji: "🔥", swatches: ["#ff6b6b", "#c44569", "#574b90"] },
  { id: "mint",         name: "Néon Menthe",     emoji: "🍃", swatches: ["#2dd4a8", "#73ffb8", "#1b4332"] },
  { id: "lavender",     name: "Lavande",         emoji: "💜", swatches: ["#9b72cf", "#c9a0dc", "#574b90"] },
  { id: "amber",        name: "Ambre d'Automne", emoji: "🍂", swatches: ["#d4842a", "#9b4423", "#e8b84a"] },
  { id: "sky",          name: "Ciel Pêche",      emoji: "☁️", swatches: ["#7dd3fc", "#fecaca", "#f9a8a8"] },
  { id: "emerald",      name: "Émeraude Royal",  emoji: "💎", swatches: ["#0d7a5f", "#c9a84c", "#064e3b"] },
  { id: "rose-gold",    name: "Rose Gold",       emoji: "🌹", swatches: ["#e8a87c", "#c4654a", "#8b7355"] },
  { id: "cyber",        name: "Cyberpunk",       emoji: "🤖", swatches: ["#ff00ff", "#00ffff", "#ffff00"] },
  { id: "slate",        name: "Ardoise Pro",     emoji: "💼", swatches: ["#475569", "#3b82f6", "#94a3b8"] },
];

export const DEFAULT_THEME = "duo-green";

export function applyTheme(themeId: string) {
  if (typeof document === "undefined") return;
  const id = THEMES.find((t) => t.id === themeId) ? themeId : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", id);
  try { localStorage.setItem("theme", id); } catch { /* noop */ }
}

export function getInitialTheme(): string {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  try { return localStorage.getItem("theme") || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}