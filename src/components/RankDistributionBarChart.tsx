import { useMemo, useRef, useState, type ReactNode } from "react";
import type { RankState } from "../types/rank";
import { RANK_TIER_ORDER } from "../lib/rank";
import "./viz.css";

const WIDTH = 960;
const HEIGHT = 420;
const MARGIN = { top: 24, right: 20, bottom: 90, left: 48 };
const BAR_MAX_WIDTH = 14;
const SUBRANKS = [1, 2, 3, 4, 5, 6] as const;
const SUBRANK_NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

// only 8 rank-tier colors are validated for reliable side-by-side contrast,
// so the palette cycles past that; x-axis position + labels still carry
// identity for every group, color is a secondary grouping cue
function tierColorVar(tierIndex: number): string {
  return `var(--tier-color-${tierIndex % 8})`;
}

function niceStep(range: number): number {
  const rough = range / 5 || 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = normalized < 1.5 ? 1 : normalized < 3.5 ? 2.5 : normalized < 7.5 ? 5 : 10;
  return step * magnitude;
}

interface Props {
  title: string;
  subtitle: ReactNode;
  rankStates: RankState[];
}

export function RankDistributionBarChart({ title, subtitle, rankStates }: Props) {
  const [hovered, setHovered] = useState<{ tierIndex: number; subrankIndex: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const innerW = WIDTH - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // counts[tierIndex][subrankIndex]
  const counts = useMemo(() => {
    const grid = RANK_TIER_ORDER.map(() => [0, 0, 0, 0, 0, 0]);
    for (const state of rankStates) {
      const tierIndex = RANK_TIER_ORDER.indexOf(state.rank);
      grid[tierIndex][state.subrank - 1] += 1;
    }
    return grid;
  }, [rankStates]);

  const maxCount = Math.max(...counts.flat(), 1);
  const yStep = niceStep(maxCount);
  const yMax = Math.ceil((maxCount * 1.1) / yStep) * yStep;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += yStep) yTicks.push(v);

  // each tier group is 6 bar-slots plus 1 gap-slot, so groups read as
  // visually distinct clusters rather than one continuous strip of bars
  const unit = innerW / (RANK_TIER_ORDER.length * 7 - 1);
  const groupStride = unit * 7;
  const barWidth = Math.min(BAR_MAX_WIDTH, unit * 0.75);
  const yForCount = (count: number) => innerH - (count / yMax) * innerH;

  function showTooltip(e: React.MouseEvent, tierIndex: number, subrankIndex: number) {
    setHovered({ tierIndex, subrankIndex });
    const wrapRect = wrapRef.current?.getBoundingClientRect();
    if (wrapRect) setTooltipPos({ x: e.clientX - wrapRect.left, y: e.clientY - wrapRect.top });
  }

  return (
    <div className="viz-root">
      <div className="viz-card">
        <h2>{title}</h2>
        <p className="viz-subtitle">{subtitle}</p>

        <div ref={wrapRef} style={{ position: "relative" }}>
          <svg
            className="viz-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Bar chart of player count by rank and subrank, colored by rank — ${title}`}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {yTicks.map((t) => (
                <g key={t}>
                  <line className="viz-gridline" x1={0} x2={innerW} y1={yForCount(t)} y2={yForCount(t)} />
                  <text className="viz-tick" x={-10} y={yForCount(t)} textAnchor="end" dy="0.32em">
                    {t.toLocaleString()}
                  </text>
                </g>
              ))}
              <line className="viz-axis" x1={0} x2={0} y1={0} y2={innerH} />
              <line className="viz-axis" x1={0} x2={innerW} y1={innerH} y2={innerH} />

              {RANK_TIER_ORDER.map((tier, tierIndex) => {
                const groupX = tierIndex * groupStride;
                const groupCenter = groupX + (6 * unit) / 2;
                return (
                  <g key={tier}>
                    {SUBRANKS.map((subrank, subrankIndex) => {
                      const count = counts[tierIndex][subrankIndex];
                      const x = groupX + subrankIndex * unit + (unit - barWidth) / 2;
                      const y = yForCount(count);
                      const height = innerH - y;
                      const isHovered =
                        hovered?.tierIndex === tierIndex && hovered.subrankIndex === subrankIndex;
                      return (
                        <g
                          key={subrank}
                          onMouseMove={(e) => showTooltip(e, tierIndex, subrankIndex)}
                          onMouseLeave={() => {
                            setHovered(null);
                            setTooltipPos(null);
                          }}
                        >
                          <rect x={x} y={0} width={unit} height={innerH} fill="transparent" />
                          {height > 0 && (
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={height}
                              rx={2}
                              fill={tierColorVar(tierIndex)}
                              opacity={hovered === null || isHovered ? 1 : 0.55}
                            />
                          )}
                        </g>
                      );
                    })}
                    <text
                      className="viz-tick"
                      x={groupCenter}
                      y={innerH + 14}
                      textAnchor="end"
                      transform={`rotate(-40, ${groupCenter}, ${innerH + 14})`}
                    >
                      {tier}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {hovered && tooltipPos && (
            <div className="viz-tooltip" style={{ left: tooltipPos.x, top: Math.max(0, tooltipPos.y - 12) }}>
              <p className="viz-tooltip-title">
                {RANK_TIER_ORDER[hovered.tierIndex]} {SUBRANK_NUMERALS[hovered.subrankIndex]}
              </p>
              <div className="viz-tooltip-row">
                <strong>{counts[hovered.tierIndex][hovered.subrankIndex]}</strong> players
              </div>
            </div>
          )}
        </div>

        <div className="viz-legend">
          {RANK_TIER_ORDER.map((tier, tierIndex) => (
            <span className="viz-legend-item" key={tier}>
              <span className="viz-legend-swatch" style={{ background: tierColorVar(tierIndex) }} />
              {tier}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
