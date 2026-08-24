import type { GeneratedPlayer } from "./population.ts";
import type { RankState } from "./rank.ts";

export interface PlayerRecord extends GeneratedPlayer {
  gamesPlayed: number;
  wins: number;
  rankState: RankState; // final rank state
  rankHistory: RankState[]; // rank state at the end of each simulated day
}

export interface SimulationData {
  generatedAt: string;
  days: number;
  players: PlayerRecord[];
}
