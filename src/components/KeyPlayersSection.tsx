import type { SimulationData } from "../types/simulation";
import type { RankState } from "../types/rank";
import { selectKeyPlayers, type Level } from "../lib/keyPlayers";
import { formatRankState, rankScore } from "../lib/rank";
import "./viz.css";
import "./KeyPlayersSection.css";

interface Props {
  simulation: SimulationData;
}

function levelLabel(level: Level, axis: "play rate" | "win rate"): string {
  return `${level === "low" ? "Low" : "High"} ${axis}`;
}

// includes rank points so two states in the same subrank (e.g. Sentinel IV
// early vs. late) still read as visibly different, not a no-op change
function detailedLabel(state: RankState): string {
  return `${formatRankState(state)} (${state.rankPoints}/${state.pointsToPromote})`;
}

function rankChangeSentence(initial: RankState, final: RankState, delta: number): string {
  const initialLabel = detailedLabel(initial);
  const finalLabel = detailedLabel(final);
  const points = Math.abs(Math.round(delta)).toLocaleString();
  if (delta > 50) return `Climbed from ${initialLabel} to ${finalLabel} (+${points} rank points).`;
  if (delta < -50) return `Fell from ${initialLabel} to ${finalLabel} (-${points} rank points).`;
  return `Held steady: started at ${initialLabel}, ended at ${finalLabel}.`;
}

// Rank tier names (Mystic, Sentinel, ...) don't read as ordered on their own,
// so the compact stat needs an explicit direction cue — never rely on the
// reader inferring "up" or "down" from the tier name alone.
function RankDelta({ delta }: { delta: number }) {
  const direction = delta > 50 ? "up" : delta < -50 ? "down" : "flat";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "–";
  const signedPoints = `${delta >= 0 ? "+" : "-"}${Math.abs(Math.round(delta)).toLocaleString()}`;
  return (
    <span className={`rank-delta is-${direction}`}>
      {arrow} {signedPoints} pts
    </span>
  );
}

export function KeyPlayersSection({ simulation }: Props) {
  const keyPlayers = selectKeyPlayers(simulation.players);

  return (
    <div className="viz-root">
      <div className="viz-card">
        <h2>Four key players</h2>
        <p className="viz-subtitle">
          One representative player from each corner of play rate × win rate, after {simulation.days}{" "}
          simulated days.
        </p>

        <div className="key-players-grid">
          {keyPlayers.map(({ player, playRateLevel, winRateLevel, winRate }) => {
            const initialLabel = formatRankState(player.initialRankState);
            const finalLabel = formatRankState(player.rankState);
            const sameSubrank =
              player.initialRankState.rank === player.rankState.rank &&
              player.initialRankState.subrank === player.rankState.subrank;
            const delta = rankScore(player.rankState) - rankScore(player.initialRankState);

            return (
              <div className="key-player-card" key={player.id}>
                <h3>
                  {levelLabel(playRateLevel, "play rate")}, {levelLabel(winRateLevel, "win rate")}
                </h3>
                <p className="key-player-meta">
                  Player #{player.id} · skill {player.skill.toFixed(2)}
                </p>
                <dl className="key-player-stats">
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
                      <br />
                      {initialLabel} → {finalLabel}
                      {sameSubrank && " (same subrank)"}
                    </dd>
                  </div>
                </dl>
                <p className="key-player-summary">
                  Played {player.gamesPlayed} game{player.gamesPlayed === 1 ? "" : "s"} over{" "}
                  {simulation.days} days.{" "}
                  {rankChangeSentence(player.initialRankState, player.rankState, delta)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
