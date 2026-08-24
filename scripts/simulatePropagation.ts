// Simulation: "Propagation of players under ideal conditions"
//
// Reads the player population from public/data/players.json and simulates
// DAYS of matchmade games under the new ranking system (no boosting or
// smurfing — pure skill plus per-game variance). Each day, every player's
// game count is sampled around their personal avgGamesPerDay (Poisson,
// capped at 8), then matchmaking runs one pass per game so higher-activity
// players get multiple matches that day. Writes the resulting rank
// progression to public/data/simulation.json for the front-end to visualize.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeneratedPlayer, PlayerPopulation } from "../src/types/population.ts";
import type { PlayerRecord, SimulationData } from "../src/types/simulation.ts";
import type { RankState } from "../src/types/rank.ts";
import { applyRankPointsDelta, rankScore, winStreakBonus } from "../src/lib/rank.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = resolve(__dirname, "../public/data/players.json");
const OUTPUT_PATH = resolve(__dirname, "../public/data/simulation.json");

const DAYS = 30;

// per the wiki: "+/- 250 points on average" per win/loss
const BASE_POINTS_PER_GAME = 250;

const MAX_GAMES_PER_DAY = 8;

// Standard normal via Box-Muller, used for per-game outcome/points variance.
function randomNormal(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Knuth's algorithm — samples how many games a player queues for today,
// centered on their personal average.
function samplePoisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const threshold = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > threshold);
  return Math.min(MAX_GAMES_PER_DAY, k - 1);
}

interface SimPlayer extends GeneratedPlayer {
  state: RankState;
  gamesPlayed: number;
  wins: number;
  rankHistory: RankState[];
}

function loadPopulation(): PlayerPopulation {
  if (!existsSync(INPUT_PATH)) {
    throw new Error(`No player population found at ${INPUT_PATH}. Run "npm run generate" first.`);
  }
  return JSON.parse(readFileSync(INPUT_PATH, "utf-8"));
}

function initSimPlayers(players: GeneratedPlayer[]): SimPlayer[] {
  return players.map((p) => ({
    ...p,
    state: p.initialRankState,
    gamesPlayed: 0,
    wins: 0,
    rankHistory: [],
  }));
}

function playMatch(a: SimPlayer, b: SimPlayer): void {
  // outcome driven by relative skill plus randomness (ideal-conditions
  // model: no boosting/smurfing, just skill + variance per game)
  const skillEdge = (a.skill - b.skill) * 4; // amplify into logistic range
  const outcomeNoise = randomNormal() * 1.5;
  const aWins = 1 / (1 + Math.exp(-(skillEdge + outcomeNoise))) > Math.random();
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;

  const pointsNoise = randomNormal() * 40;
  const streakBonus = winStreakBonus(winner.state.winStreak + 1);

  winner.state = applyRankPointsDelta(winner.state, BASE_POINTS_PER_GAME + streakBonus + pointsNoise);
  winner.state.winStreak += 1;

  loser.state = applyRankPointsDelta(loser.state, -BASE_POINTS_PER_GAME + pointsNoise);
  loser.state.winStreak = 0;

  winner.gamesPlayed += 1;
  winner.wins += 1;
  loser.gamesPlayed += 1;
}

function simulateDay(players: SimPlayer[]): void {
  const gamesRemaining = new Map<SimPlayer, number>();
  let maxGamesToday = 0;
  for (const p of players) {
    const games = samplePoisson(p.avgGamesPerDay);
    gamesRemaining.set(p, games);
    maxGamesToday = Math.max(maxGamesToday, games);
  }

  // one matchmaking pass per game-slot, so a player with more games queued
  // today plays multiple matches while low-activity players sit some out
  for (let pass = 0; pass < maxGamesToday; pass += 1) {
    const queued = players.filter((p) => (gamesRemaining.get(p) ?? 0) > 0);
    // simple matchmaking: sort by current rank score and pair up neighbors
    queued.sort((a, b) => rankScore(a.state) - rankScore(b.state));

    for (let i = 0; i + 1 < queued.length; i += 2) {
      const a = queued[i];
      const b = queued[i + 1];
      playMatch(a, b);
      gamesRemaining.set(a, (gamesRemaining.get(a) ?? 0) - 1);
      gamesRemaining.set(b, (gamesRemaining.get(b) ?? 0) - 1);
    }
  }

  for (const p of players) {
    p.rankHistory.push(p.state);
  }
}

function run(population: PlayerPopulation): SimulationData {
  const players = initSimPlayers(population.players);
  for (let day = 0; day < DAYS; day += 1) {
    simulateDay(players);
  }

  const records: PlayerRecord[] = players.map((p) => ({
    id: p.id,
    skill: p.skill,
    skillQuartile: p.skillQuartile,
    avgGamesPerDay: p.avgGamesPerDay,
    initialRankState: p.initialRankState,
    gamesPlayed: p.gamesPlayed,
    wins: p.wins,
    rankState: p.state,
    rankHistory: p.rankHistory,
  }));

  return {
    generatedAt: new Date().toISOString(),
    days: DAYS,
    players: records,
  };
}

const population = loadPopulation();
const data = run(population);
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
console.log(`Wrote ${data.players.length} players over ${data.days} days to ${OUTPUT_PATH}`);
