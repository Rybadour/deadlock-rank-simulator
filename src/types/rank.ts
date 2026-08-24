// Modeled on the ranking system from https://deadlock.wiki/Update:July_30,_2026

// "Obscurus" isn't a real rank — the wiki uses it as a placeholder label for
// the 8-game calibration phase before a player is placed into a real rank.
export type RankTier =
  | "Initiate"
  | "Seeker"
  | "Acolyte"
  | "Sentinel"
  | "Mystic"
  | "Ritualist"
  | "Emissary"
  | "Oracle"
  | "Phantom"
  | "Ascendant"
  | "Eternus";

// Subranks run I - VI within a tier; represented numerically (1 = I, 6 = VI)
export type Subrank = 1 | 2 | 3 | 4 | 5 | 6;

export interface RankState {
  rank: RankTier;
  subrank: Subrank;
  winStreak: number;
  // rank points earned toward the next subrank/tier, resets to 0 on promotion
  rankPoints: number;
  // points needed to promote: 1000 within a tier, 2000 when crossing into the next tier
  pointsToPromote: number;
}
