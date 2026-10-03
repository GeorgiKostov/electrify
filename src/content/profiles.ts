export const hourly = {
  household: [
    0.25, 0.22, 0.2, 0.19, 0.2, 0.28, 0.48, 0.55, 0.55, 0.42, 0.36, 0.34, 0.33,
    0.34, 0.36, 0.42, 0.5, 0.6, 0.715, 1, 0.93, 0.9, 0.46, 0.32,
  ],
  cafe: [
    0.05, 0.04, 0.04, 0.04, 0.05, 0.12, 0.55, 0.9, 1, 0.78, 0.65, 0.82, 0.95,
    0.82, 0.65, 0.55, 0.4, 0.25, 0.15, 0.1, 0.08, 0.06, 0.05, 0.05,
  ],
  workshop: [
    0, 0, 0, 0, 0, 0, 0.02, 0.55, 0.9, 1, 1, 0.8, 0.7, 0.9, 1, 1, 0.8, 0.35,
    0.05, 0, 0, 0, 0, 0,
  ],
  solar: [
    0, 0, 0, 0, 0, 0, 0.03, 0.12, 0.3, 0.52, 0.72, 0.88, 1, 0.95, 0.82, 0.62,
    0.38, 0.16, 0.04, 0, 0, 0, 0, 0,
  ],
};
export type Profile = keyof typeof hourly;
export function expand(hour: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 96; i++) {
    const h = (i / 4) | 0,
      f = (i % 4) / 4;
    out.push(hour[h] * (1 - f) + hour[(h + 1) % 24] * f);
  }
  return out;
}
export const profiles: Record<Profile, number[]> = Object.fromEntries(
  Object.entries(hourly).map(([k, v]) => [k, expand(v)]),
) as Record<Profile, number[]>;
