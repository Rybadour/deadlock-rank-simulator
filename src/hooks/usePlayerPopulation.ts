import { useJsonData } from "./useJsonData";
import type { PlayerPopulation } from "../types/population";

export function usePlayerPopulation() {
  return useJsonData<PlayerPopulation>("data/players.json");
}
