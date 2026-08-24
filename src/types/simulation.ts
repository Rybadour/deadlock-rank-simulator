import type { GeneratedPlayer } from "./population.ts";
import type { RankState } from "./rank.ts";

export interface GameLogEntry {
  day: number;
  won: boolean;
  pointsDelta: number; // signed rank-points change from this game, rounded
  winStreakAfter: number;
  rankAfter: RankState;
}

export interface PlayerRecord extends GeneratedPlayer {
  gamesPlayed: number;
  wins: number;
  rankState: RankState; // final rank state
  rankHistory: RankState[]; // rank state at the end of each simulated day
  gameLog: GameLogEntry[]; // one entry per game actually played, in order
}

export interface SimulationData {
  generatedAt: string;
  days: number;
  players: PlayerRecord[];
}
