// Generates a population of players and writes it to public/data/players.json.
// This is just the raw data set — no simulation happens here. Run a
// simulation script (e.g. simulatePropagation.ts) against the output to
// transform it into rank-progression data for the front-end.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeneratedPlayer, PlayerPopulation } from "../src/types/population.ts";
import { createPlacementRankState } from "../src/lib/rank.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../public/data/players.json");

const DEFAULT_POPULATION = 1000;

// Standard normal via Box-Muller, used to give skill a bell-curve shape.
function randomNormal(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentileOf(skill: number, sortedSkills: number[]): number {
  const index = sortedSkills.findIndex((s) => s >= skill);
  return index / sortedSkills.length;
}

function assignSkillQuartile(percentile: number): number {
  return clamp(Math.floor(percentile * 4), 0, 3);
}

function run(population: number): PlayerPopulation {
  const raw = Array.from({ length: population }, (_, id) => ({
    id,
    // skill centered at 0.5, spread by std dev ~0.15, clipped to [0, 1]
    skill: clamp(0.5 + randomNormal() * 0.15, 0, 1),
    // this player's personal mean games/day, independent of skill so a
    // simulation can test whether skill alone wins out over play frequency;
    // population averages ~3/day, individuals range 0-8
    avgGamesPerDay: clamp(3 + randomNormal() * 1.8, 0, 8),
  }));

  const sortedSkills = raw.map((p) => p.skill).sort((a, b) => a - b);

  const players: GeneratedPlayer[] = raw.map((p) => {
    const percentile = percentileOf(p.skill, sortedSkills);
    return {
      id: p.id,
      skill: Number(p.skill.toFixed(4)),
      skillQuartile: assignSkillQuartile(percentile),
      avgGamesPerDay: Number(p.avgGamesPerDay.toFixed(4)),
      // calibration placement is skill-driven but imperfect, per the wiki's
      // 8-game calibration phase (capped at Oracle VI)
      initialRankState: createPlacementRankState(percentile, randomNormal() * 3000),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    players,
  };
}

const populationArg = Number(process.argv[2]);
const population = Number.isFinite(populationArg) && populationArg > 0 ? populationArg : DEFAULT_POPULATION;

const data = run(population);
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
console.log(`Wrote ${data.players.length} players to ${OUTPUT_PATH}`);
