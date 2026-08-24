import { useMemo } from "react";
import { usePlayerPopulation } from "./hooks/usePlayerPopulation";
import { useSimulationData } from "./hooks/useSimulationData";
import { RankDistributionBarChart } from "./components/RankDistributionBarChart";
import { KeyPlayersSection } from "./components/KeyPlayersSection";
import { PlayerExplorer } from "./components/PlayerExplorer";
import "./App.css";

function App() {
  const population = usePlayerPopulation();
  const simulation = useSimulationData();

  const initialRankStates = useMemo(
    () => population.data?.players.map((p) => p.initialRankState) ?? null,
    [population.data],
  );
  const finalRankStates = useMemo(
    () => simulation.data?.players.map((p) => p.rankState) ?? null,
    [simulation.data],
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1>Deadlock Ranking Simulator</h1>
        <p>
          Simulating player rank propagation under the July 2026 matchmaking update, to test
          whether skilled players still climb faster even when they play less.
        </p>
      </header>

      {(population.loading || simulation.loading) && <p className="status">Loading data…</p>}
      {population.error && (
        <p className="status status-error">
          Couldn't load player data ({population.error}). Run <code>npm run generate</code> to
          create it.
        </p>
      )}
      {simulation.error && (
        <p className="status status-error">
          Couldn't load simulation data ({simulation.error}). Run{" "}
          <code>npm run simulate:propagation</code> to create it.
        </p>
      )}

      <main className="charts">
        {initialRankStates && (
          <RankDistributionBarChart
            title="Players by initial rank"
            subtitle={
              <>
                Count of generated players placed into each rank and subrank during calibration (
                <code>players.json</code>), colored by rank.
              </>
            }
            rankStates={initialRankStates}
          />
        )}

        {finalRankStates && simulation.data && (
          <RankDistributionBarChart
            title={`Players by rank after ${simulation.data.days} days`}
            subtitle={
              <>
                Final result of the "propagation of players under ideal conditions" simulation (
                <code>simulation.json</code>) after {simulation.data.days} simulated days,
                colored by rank.
              </>
            }
            rankStates={finalRankStates}
          />
        )}

        {simulation.data && <KeyPlayersSection simulation={simulation.data} />}
        {simulation.data && <PlayerExplorer simulation={simulation.data} />}
      </main>
    </div>
  );
}

export default App;
