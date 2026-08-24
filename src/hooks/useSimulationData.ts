import { useJsonData } from "./useJsonData";
import type { SimulationData } from "../types/simulation";

export function useSimulationData() {
  return useJsonData<SimulationData>("data/simulation.json");
}
