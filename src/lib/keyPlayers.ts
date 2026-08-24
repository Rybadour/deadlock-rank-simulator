import type { PlayerRecord } from "../types/simulation";

export type Level = "low" | "high";

export interface KeyPlayer {
  playRateLevel: Level;
  winRateLevel: Level;
  player: PlayerRecord;
  winRate: number; // 0-1, wins / gamesPlayed
}

// below this, win rate is too noisy to label meaningfully (e.g. 1/1 = "100%")
const MIN_GAMES_FOR_SELECTION = 5;

// 0 (lowest value in the pool) .. 1 (highest), preserving input order
function percentileRanks(values: number[]): number[] {
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const percentile = new Array<number>(values.length);
  order.forEach((originalIndex, rank) => {
    percentile[originalIndex] = values.length > 1 ? rank / (values.length - 1) : 0.5;
  });
  return percentile;
}

const CORNERS: { playRateLevel: Level; winRateLevel: Level; targetPlay: number; targetWin: number }[] = [
  { playRateLevel: "low", winRateLevel: "low", targetPlay: 0, targetWin: 0 },
  { playRateLevel: "low", winRateLevel: "high", targetPlay: 0, targetWin: 1 },
  { playRateLevel: "high", winRateLevel: "low", targetPlay: 1, targetWin: 0 },
  { playRateLevel: "high", winRateLevel: "high", targetPlay: 1, targetWin: 1 },
];

// Picks one representative player per (play rate, win rate) quadrant — the
// player whose percentile rank on both axes sits closest to that quadrant's
// corner — so the four examples span the extremes of the population.
export function selectKeyPlayers(players: PlayerRecord[]): KeyPlayer[] {
  const eligible = players.filter((p) => p.gamesPlayed >= MIN_GAMES_FOR_SELECTION);
  const pool = eligible.length >= CORNERS.length ? eligible : players;

  const playPercentiles = percentileRanks(pool.map((p) => p.avgGamesPerDay));
  const winRates = pool.map((p) => p.wins / Math.max(1, p.gamesPlayed));
  const winPercentiles = percentileRanks(winRates);

  const used = new Set<number>();

  return CORNERS.map((corner) => {
    let bestIndex = -1;
    let bestDist = Infinity;
    for (let i = 0; i < pool.length; i += 1) {
      if (used.has(i)) continue;
      const dPlay = playPercentiles[i] - corner.targetPlay;
      const dWin = winPercentiles[i] - corner.targetWin;
      const dist = dPlay * dPlay + dWin * dWin;
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }
    used.add(bestIndex);
    return {
      playRateLevel: corner.playRateLevel,
      winRateLevel: corner.winRateLevel,
      player: pool[bestIndex],
      winRate: winRates[bestIndex],
    };
  });
}
