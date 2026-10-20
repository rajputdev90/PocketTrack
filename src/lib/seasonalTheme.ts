export const HALLOWEEN_THEME_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export const halloweenThemeExpiry = (now = new Date()) =>
  new Date(now.getTime() + HALLOWEEN_THEME_DAYS * DAY_MS).toISOString();

export const isHalloweenThemeActive = (
  expiresAt: string | null | undefined,
  now = Date.now(),
) => Boolean(expiresAt && Date.parse(expiresAt) > now);
