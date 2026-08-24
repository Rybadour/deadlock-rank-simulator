import type { RankState } from "../types/rank";
import { formatRankState } from "../lib/rank";
import "./RankDelta.css";

// includes rank points so two states in the same subrank (e.g. Sentinel IV
// early vs. late) still read as visibly different, not a no-op change
export function detailedRankLabel(state: RankState): string {
  return `${formatRankState(state)} (${state.rankPoints}/${state.pointsToPromote})`;
}

export function rankChangeSentence(initial: RankState, final: RankState, delta: number): string {
  const initialLabel = detailedRankLabel(initial);
  const finalLabel = detailedRankLabel(final);
  const points = Math.abs(Math.round(delta)).toLocaleString();
  if (delta > 50) return `Climbed from ${initialLabel} to ${finalLabel} (+${points} rank points).`;
  if (delta < -50) return `Fell from ${initialLabel} to ${finalLabel} (-${points} rank points).`;
  return `Held steady: started at ${initialLabel}, ended at ${finalLabel}.`;
}

// Rank tier names (Mystic, Sentinel, ...) don't read as ordered on their own,
// so any compact stat needs an explicit direction cue — never rely on the
// reader inferring "up" or "down" from the tier name alone.
export function RankDelta({ delta }: { delta: number }) {
  const direction = delta > 50 ? "up" : delta < -50 ? "down" : "flat";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "–";
  const signedPoints = `${delta >= 0 ? "+" : "-"}${Math.abs(Math.round(delta)).toLocaleString()}`;
  return (
    <span className={`rank-delta is-${direction}`}>
      {arrow} {signedPoints} pts
    </span>
  );
}
