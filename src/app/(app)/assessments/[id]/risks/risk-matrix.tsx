"use client";

import {
  LIKELIHOOD_DEFS,
  CONSEQUENCE_DEFS,
  riskLevel,
} from "@/lib/risk-definitions";
import type { RiskLikelihood, RiskConsequence } from "@/types/database";

interface RiskMatrixProps {
  likelihood: RiskLikelihood | null;
  consequence: RiskConsequence | null;
  onChange?: (l: RiskLikelihood, c: RiskConsequence) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function RiskMatrix({
  likelihood,
  consequence,
  onChange,
  readOnly = false,
  compact = false,
}: RiskMatrixProps) {
  // Y axis (rows, top = highest consequence)
  const consequenceRows = [...CONSEQUENCE_DEFS].reverse();
  // X axis (cols, left = lowest likelihood)
  const likelihoodCols = LIKELIHOOD_DEFS;

  const cellSize = compact ? "h-6 w-6 text-[10px]" : "h-10 w-full text-xs";

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        <table className="border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th></th>
              {likelihoodCols.map((l) => (
                <th
                  key={l.value}
                  title={l.description}
                  className={`${compact ? "text-[9px]" : "text-xs"} font-medium text-muted-foreground px-1 pb-1 cursor-help`}
                >
                  {compact ? l.label.slice(0, 3) : l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {consequenceRows.map((c) => (
              <tr key={c.value}>
                <td
                  title={c.description}
                  className={`${compact ? "text-[9px]" : "text-xs"} font-medium text-muted-foreground pr-1.5 cursor-help text-right`}
                >
                  {compact ? c.label.slice(0, 3) : c.label}
                </td>
                {likelihoodCols.map((l) => {
                  const score = l.score * c.score;
                  const level = riskLevel(score);
                  const selected =
                    likelihood === l.value && consequence === c.value;
                  return (
                    <td key={l.value}>
                      <button
                        type="button"
                        onClick={() => {
                          if (readOnly) return;
                          onChange?.(l.value, c.value);
                        }}
                        title={`${l.label} × ${c.label} = ${score} (${level.label})`}
                        disabled={readOnly}
                        className={`${cellSize} ${level.bg} ${level.border} rounded border transition-all flex items-center justify-center font-semibold ${
                          selected
                            ? "ring-2 ring-offset-1 ring-primary scale-105"
                            : readOnly
                              ? "cursor-default opacity-80"
                              : "hover:scale-105 hover:ring-1 hover:ring-primary/50"
                        } ${level.text}`}
                      >
                        {compact ? "" : score}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!compact && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Consequence (rows) × Likelihood (columns). Hover a label for its definition.
          </p>
        )}
      </div>
    </div>
  );
}

interface OverviewMatrixProps {
  risks: {
    id: string;
    description: string;
    likelihood: RiskLikelihood;
    consequence: RiskConsequence;
    ai_suggested?: boolean;
  }[];
  onDotClick?: (riskId: string) => void;
}

export function OverviewMatrix({ risks, onDotClick }: OverviewMatrixProps) {
  const consequenceRows = [...CONSEQUENCE_DEFS].reverse();
  const likelihoodCols = LIKELIHOOD_DEFS;

  function risksInCell(l: RiskLikelihood, c: RiskConsequence) {
    return risks.filter((r) => r.likelihood === l && r.consequence === c);
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th></th>
              {likelihoodCols.map((l) => (
                <th
                  key={l.value}
                  title={l.description}
                  className="text-xs font-medium text-muted-foreground px-1 pb-1 cursor-help"
                >
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {consequenceRows.map((c) => (
              <tr key={c.value}>
                <td
                  title={c.description}
                  className="text-xs font-medium text-muted-foreground pr-2 cursor-help text-right"
                >
                  {c.label}
                </td>
                {likelihoodCols.map((l) => {
                  const score = l.score * c.score;
                  const level = riskLevel(score);
                  const cellRisks = risksInCell(l.value, c.value);
                  return (
                    <td key={l.value}>
                      <div
                        className={`${level.bg} ${level.border} min-h-[64px] min-w-[72px] rounded border p-1 flex flex-wrap gap-1 items-start content-start`}
                      >
                        {cellRisks.length === 0 ? (
                          <span className={`text-[10px] ${level.text} opacity-60`}>
                            {score}
                          </span>
                        ) : (
                          cellRisks.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => onDotClick?.(r.id)}
                              title={r.description}
                              className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-sm hover:scale-125 transition-transform"
                            >
                              {r.ai_suggested ? "★" : "●"}
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          Each dot represents one risk (★ = AI-suggested). Click to view its details. Hover for description.
        </p>
      </div>
    </div>
  );
}
