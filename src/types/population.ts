import type { RankState } from "./rank.ts";

export interface GeneratedPlayer {
  id: number;
  skill: number; // true hidden skill, 0-1
  skillQuartile: number; // 0 (lowest) - 3 (highest)
  avgGamesPerDay: number; // this player's personal mean games/day, 0-8; actual daily count is sampled around it
  initialRankState: RankState; // calibration placement, capped at Oracle VI
}

export interface PlayerPopulation {
  generatedAt: string;
  players: GeneratedPlayer[];
}
