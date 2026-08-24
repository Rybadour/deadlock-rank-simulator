import type { RankState, RankTier, Subrank } from "../types/rank.ts";

// Ordered lowest to highest, per https://deadlock.wiki/Update:July_30,_2026
export const RANK_TIER_ORDER: RankTier[] = [
  "Initiate",
  "Seeker",
  "Acolyte",
  "Sentinel",
  "Mystic",
  "Ritualist",
  "Emissary",
  "Oracle",
  "Phantom",
  "Ascendant",
  "Eternus",
];

const SUBRANK_NUMERALS = ["I", "II", "III", "IV", "V", "VI"] as const;

// 1000 points per subrank promotion, 2000 to cross into the next tier (wiki)
function pointsToPromoteFrom(subrank: Subrank): number {
  return subrank === 6 ? 2000 : 1000;
}

// Cumulative points spent to reach a given subrank from subrank I of its
// tier: five 1000-point promotions (I->II ... V->VI) plus subrank VI's own
// span, which is 2000 wide since promoting OUT of VI costs 2000. A tier
// therefore spans 7000 total, not 6000 — get this wrong and rankScore()
// jumps backwards for any state that crosses a tier boundary.
function subrankSpanStart(subrank: Subrank): number {
  return subrank <= 5 ? (subrank - 1) * 1000 : 5000;
}
const TIER_SPAN = 7000;

export function createInitialRankState(): RankState {
  return { rank: "Initiate", subrank: 1, winStreak: 0, rankPoints: 0, pointsToPromote: pointsToPromoteFrom(1) };
}

// Total ordering over rank states, useful for matchmaking and charting.
export function rankScore(state: RankState): number {
  const tierIndex = RANK_TIER_ORDER.indexOf(state.rank);
  return tierIndex * TIER_SPAN + subrankSpanStart(state.subrank) + state.rankPoints;
}

// Bonus rank points awarded on top of the base +250 for winning while on a
// streak, per https://deadlock.wiki/Update:July_30,_2026
export function winStreakBonus(winStreak: number): number {
  if (winStreak >= 6) return 130;
  if (winStreak === 5) return 110;
  if (winStreak === 4) return 90;
  if (winStreak === 3) return 70;
  return 0;
}

export function formatRankState(state: RankState): string {
  return `${state.rank} ${SUBRANK_NUMERALS[state.subrank - 1]}`;
}

// Inverse of rankScore: decomposes a (possibly fractional/averaged) score
// back into a RankState. maxTierIndex lets callers cap the range, e.g. for
// calibration placement, which never places a player above Oracle.
function rankStateFromScore(score: number, maxTierIndex: number): RankState {
  const clamped = clamp(score, 0, (maxTierIndex + 1) * TIER_SPAN - 1);
  const tierIndex = clamp(Math.floor(clamped / TIER_SPAN), 0, maxTierIndex);
  const remainder = clamped - tierIndex * TIER_SPAN;
  const subrank = (remainder < 5000 ? Math.floor(remainder / 1000) + 1 : 6) as Subrank;
  const rankPoints = Math.round(remainder - subrankSpanStart(subrank));
  return { rank: RANK_TIER_ORDER[tierIndex], subrank, winStreak: 0, rankPoints, pointsToPromote: pointsToPromoteFrom(subrank) };
}

// Labels chart axes/averages where a fractional score (e.g. an average
// across players) doesn't map to a real, individually-earned RankState.
export function describeRankScore(score: number): string {
  return formatRankState(rankStateFromScore(score, RANK_TIER_ORDER.length - 1));
}

const CALIBRATION_CEILING_TIER_INDEX = RANK_TIER_ORDER.indexOf("Oracle");

// Every generated player is placed straight into a rank rather than starting
// at Initiate I — this stands in for the wiki's 8-game calibration phase,
// which the wiki says caps out at "Oracle VI". Placement is skewed by skill
// percentile (0 = worst in the population, 1 = best) with noise, since
// calibration performance isn't a perfect predictor of true skill.
export function createPlacementRankState(skillPercentile: number, noise = 0): RankState {
  const maxScore = (CALIBRATION_CEILING_TIER_INDEX + 1) * TIER_SPAN;
  const score = clamp(skillPercentile * maxScore + noise, 0, maxScore - 1);
  return rankStateFromScore(score, CALIBRATION_CEILING_TIER_INDEX);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Applies a signed rank-points delta, cascading promotions/demotions across
// subrank and tier boundaries. Floors at Initiate I and caps at Eternus VI
// (the wiki says Eternus subranks are re-segmented daily by percentile
// instead of fixed points, which this simplified model doesn't attempt).
export function applyRankPointsDelta(state: RankState, delta: number): RankState {
  let tierIndex = RANK_TIER_ORDER.indexOf(state.rank);
  let subrank: Subrank = state.subrank;
  let points = state.rankPoints + delta;

  const atFloor = () => tierIndex === 0 && subrank === 1;
  const atCeiling = () => tierIndex === RANK_TIER_ORDER.length - 1 && subrank === 6;

  while (points >= pointsToPromoteFrom(subrank) && !atCeiling()) {
    points -= pointsToPromoteFrom(subrank);
    if (subrank === 6) {
      tierIndex += 1;
      subrank = 1;
    } else {
      subrank = (subrank + 1) as Subrank;
    }
  }

  while (points < 0 && !atFloor()) {
    if (subrank === 1) {
      tierIndex -= 1;
      subrank = 6;
    } else {
      subrank = (subrank - 1) as Subrank;
    }
    points += pointsToPromoteFrom(subrank);
  }

  points = atFloor() ? Math.max(0, points) : points;
  points = atCeiling() ? Math.min(points, pointsToPromoteFrom(subrank)) : points;

  return {
    rank: RANK_TIER_ORDER[tierIndex],
    subrank,
    winStreak: state.winStreak,
    rankPoints: Math.round(points),
    pointsToPromote: pointsToPromoteFrom(subrank),
  };
}
