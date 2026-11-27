// Canvas, Three.js and CSS share one palette. Values are read from the live
// theme so a theme change can update the WebGL scene without a reload.
const tokens = {
  canvas: '--vi-canvas',
  surface: '--vi-surface',
  ink: '--vi-ink',
  muted: '--vi-muted',
  'text-secondary': '--vi-text-secondary',
  line: '--vi-line',
  action: '--vi-action',
  'action-hover': '--vi-action-hover',
  focus: '--vi-focus',
  processing: '--vi-processing',
  conversation: '--vi-conversation',
  dialog: '--vi-dialog',
  danger: '--vi-danger',
  error: '--vi-error',
  warning: '--vi-warning',
  'site-background': '--vi-site-background',
  'hero-bg': '--vi-hero-bg',
  'hero-ink': '--vi-hero-ink',
  'hero-muted': '--vi-hero-muted',
  'page-bg': '--vi-page-bg',
  'page-ink': '--vi-page-ink',
  'page-muted': '--vi-page-muted',
  'profile-bg': '--vi-profile-bg',
  'profile-ink': '--vi-profile-ink',
  'profile-muted': '--vi-profile-muted',
  accent: '--vi-accent',
  'accent-ink': '--vi-accent-ink',
  'compass-dial': '--vi-compass-dial',
  'compass-brass': '--vi-compass-brass',
  'compass-needle': '--vi-compass-needle',
  'compass-south': '--vi-compass-south',
  'compass-ink': '--vi-compass-ink',
  'shadow-soft': '--vi-shadow-soft',
  'shadow-medium': '--vi-shadow-medium',
  'shadow-clear': '--vi-shadow-clear',
};

export const palette = {};

export function refreshPalette(root = document.documentElement) {
  const style = getComputedStyle(root);
  for (const [key, token] of Object.entries(tokens)) {
    const value = style.getPropertyValue(token).trim();
    if (value) palette[key] = value;
  }
  return palette;
}

refreshPalette();
