import { useMemo, useState } from "react";
import type { SimulationData } from "../types/simulation";
import { formatRankState, rankScore } from "../lib/rank";
import { RankDelta, detailedRankLabel, rankChangeSentence } from "./RankDelta";
import "./viz.css";
import "./PlayerExplorer.css";

interface Props {
  simulation: SimulationData;
}

export function PlayerExplorer({ simulation }: Props) {
  const [selectedId, setSelectedId] = useState(simulation.players[0]?.id ?? 0);
  const player = useMemo(
    () => simulation.players.find((p) => p.id === selectedId) ?? simulation.players[0],
    [simulation.players, selectedId],
  );

  if (!player) return null;

  const delta = rankScore(player.rankState) - rankScore(player.initialRankState);
  const winRate = player.gamesPlayed > 0 ? player.wins / player.gamesPlayed : 0;

  return (
    <div className="viz-root">
      <div className="viz-card">
        <h2>Player explorer</h2>
        <p className="viz-subtitle">
          Pick any simulated player to see their rank progression and full game-by-game history
          over {simulation.days} days.
        </p>

        <label className="player-picker">
          Player
          <select value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))}>
            {simulation.players.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} — skill {p.skill.toFixed(2)}, {formatRankState(p.rankState)}
              </option>
            ))}
          </select>
        </label>

        <div className="player-summary">
          <dl className="stat-list">
            <div>
              <dt>Skill</dt>
              <dd>{player.skill.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Play rate</dt>
              <dd>{player.avgGamesPerDay.toFixed(2)} games/day (avg)</dd>
            </div>
            <div>
              <dt>Games played</dt>
              <dd>
                {player.gamesPlayed} over {simulation.days} days
              </dd>
            </div>
            <div>
              <dt>Win rate</dt>
              <dd>
                {Math.round(winRate * 100)}% ({player.wins}-{player.gamesPlayed - player.wins})
              </dd>
            </div>
            <div>
              <dt>Rank change</dt>
              <dd>
                <RankDelta delta={delta} />
              </dd>
            </div>
          </dl>
          <p className="player-summary-sentence">
            {rankChangeSentence(player.initialRankState, player.rankState, delta)}
          </p>
        </div>

        <h3 className="game-log-heading">Full game history ({player.gameLog.length} games)</h3>
        {player.gameLog.length === 0 ? (
          <p className="viz-subtitle">This player never queued for a match during the simulation.</p>
        ) : (
          <div className="viz-table-scroll">
            <table className="viz-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Day</th>
                  <th>Result</th>
                  <th>Points</th>
                  <th>Win streak</th>
                  <th>Rank after</th>
                </tr>
              </thead>
              <tbody>
                {player.gameLog.map((entry, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{entry.day + 1}</td>
                    <td className={entry.won ? "result-win" : "result-loss"}>
                      {entry.won ? "Win" : "Loss"}
                    </td>
                    <td>
                      {entry.pointsDelta >= 0 ? "+" : ""}
                      {entry.pointsDelta}
                    </td>
                    <td>{entry.winStreakAfter}</td>
                    <td>{detailedRankLabel(entry.rankAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
