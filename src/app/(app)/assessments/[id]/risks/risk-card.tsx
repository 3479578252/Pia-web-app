"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LIKELIHOOD_DEFS,
  CONSEQUENCE_DEFS,
  RISK_CATEGORIES,
  STATUS_DEFS,
  riskScore,
  riskLevel,
} from "@/lib/risk-definitions";
import type {
  Risk,
  RiskLikelihood,
  RiskConsequence,
  RiskStatus,
} from "@/types/database";
import { RiskMatrix } from "./risk-matrix";

interface RiskCardProps {
  risk: Risk;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onChange: (updates: Partial<Risk>, immediate?: boolean) => void;
}

export function RiskCard({
  risk,
  expanded,
  onToggleExpand,
  onDelete,
  onChange,
}: RiskCardProps) {
  const [localDescription, setLocalDescription] = useState(risk.description);
  const [localCategory, setLocalCategory] = useState(risk.category ?? "");
  const [localMitigation, setLocalMitigation] = useState(risk.mitigation ?? "");

  // Track whether user has edited — clears ai_suggested badge logic is handled server side
  // but we also locally mark it as edited to flag for the parent
  const [edited, setEdited] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if upstream risk object changes (e.g. after reload)
  useEffect(() => {
    setLocalDescription(risk.description);
    setLocalCategory(risk.category ?? "");
    setLocalMitigation(risk.mitigation ?? "");
  }, [risk.id, risk.description, risk.category, risk.mitigation]);

  function scheduleSave(updates: Partial<Risk>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(updates);
    }, 800);
  }

  function flushSave(updates: Partial<Risk>) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onChange(updates);
  }

  const inherent = riskScore(risk.likelihood, risk.consequence);
  const inherentLevel = riskLevel(inherent);
  const residual =
    risk.residual_likelihood && risk.residual_consequence
      ? riskScore(risk.residual_likelihood, risk.residual_consequence)
      : null;
  const residualLevel = residual !== null ? riskLevel(residual) : null;

  const statusDef = STATUS_DEFS.find((s) => s.value === risk.status);
  const showSuggestedBadge = risk.ai_suggested && !edited;

  return (
    <div
      id={`risk-${risk.id}`}
      className="rounded-lg border overflow-hidden bg-card"
    >
      {/* Header row */}
      <div
        className={`flex items-start gap-2 px-4 py-3 ${expanded ? "border-b" : ""}`}
      >
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-start gap-3 text-left min-w-0"
        >
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {showSuggestedBadge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI suggested
                </span>
              )}
              {risk.category && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {risk.category}
                </span>
              )}
              {statusDef && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusDef.colorClass}`}
                >
                  {statusDef.label}
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-snug line-clamp-2">
              {localDescription || "(No description)"}
            </p>
          </div>
        </button>

        {/* Score badges */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`rounded-md border px-2 py-1 text-center ${inherentLevel.bg} ${inherentLevel.border} ${inherentLevel.text}`}
            title={`Inherent risk: ${inherent} (${inherentLevel.label})`}
          >
            <div className="text-[9px] uppercase tracking-wide leading-none">
              Inherent
            </div>
            <div className="text-sm font-bold leading-tight">{inherent}</div>
          </div>
          {residualLevel && (
            <div
              className={`rounded-md border px-2 py-1 text-center ${residualLevel.bg} ${residualLevel.border} ${residualLevel.text}`}
              title={`Residual risk: ${residual} (${residualLevel.label})`}
            >
              <div className="text-[9px] uppercase tracking-wide leading-none">
                Residual
              </div>
              <div className="text-sm font-bold leading-tight">{residual}</div>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this risk?")) onDelete();
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete risk"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="space-y-5 p-4">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor={`desc-${risk.id}`}>Description</Label>
            <Textarea
              id={`desc-${risk.id}`}
              value={localDescription}
              onChange={(e) => {
                setLocalDescription(e.target.value);
                setEdited(true);
                scheduleSave({ description: e.target.value });
              }}
              onBlur={() => flushSave({ description: localDescription })}
              placeholder="Describe the privacy risk..."
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {RISK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setLocalCategory(cat);
                    setEdited(true);
                    flushSave({ category: cat });
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    localCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Input
              value={localCategory}
              onChange={(e) => {
                setLocalCategory(e.target.value);
                setEdited(true);
                scheduleSave({ category: e.target.value });
              }}
              onBlur={() => flushSave({ category: localCategory })}
              placeholder="Or type a custom category"
              className="mt-2"
            />
          </div>

          {/* Inherent risk matrix */}
          <div className="space-y-1.5">
            <Label>Inherent risk (before mitigation)</Label>
            <RiskMatrix
              likelihood={risk.likelihood}
              consequence={risk.consequence}
              onChange={(l, c) => {
                setEdited(true);
                flushSave({ likelihood: l, consequence: c });
              }}
            />
            <p className="text-xs text-muted-foreground">
              {LIKELIHOOD_DEFS.find((d) => d.value === risk.likelihood)?.label}{" "}
              ×{" "}
              {
                CONSEQUENCE_DEFS.find((d) => d.value === risk.consequence)
                  ?.label
              }{" "}
              = <strong>{inherent}</strong> ({inherentLevel.label})
            </p>
          </div>

          {/* Mitigation */}
          <div className="space-y-1.5">
            <Label htmlFor={`mit-${risk.id}`}>Mitigation</Label>
            <Textarea
              id={`mit-${risk.id}`}
              value={localMitigation}
              onChange={(e) => {
                setLocalMitigation(e.target.value);
                setEdited(true);
                scheduleSave({ mitigation: e.target.value });
              }}
              onBlur={() => flushSave({ mitigation: localMitigation })}
              placeholder="What controls or actions will reduce this risk?"
              rows={3}
            />
          </div>

          {/* Residual risk matrix */}
          <div className="space-y-1.5">
            <Label>Residual risk (after mitigation)</Label>
            <RiskMatrix
              likelihood={risk.residual_likelihood}
              consequence={risk.residual_consequence}
              onChange={(l, c) => {
                setEdited(true);
                flushSave({
                  residual_likelihood: l,
                  residual_consequence: c,
                });
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {risk.residual_likelihood && risk.residual_consequence
                  ? `${LIKELIHOOD_DEFS.find((d) => d.value === risk.residual_likelihood)?.label} × ${CONSEQUENCE_DEFS.find((d) => d.value === risk.residual_consequence)?.label} = `
                  : "Not yet rated. "}
                {residual !== null && residualLevel && (
                  <>
                    <strong>{residual}</strong> ({residualLevel.label})
                  </>
                )}
              </p>
              {risk.residual_likelihood && (
                <button
                  type="button"
                  onClick={() => {
                    setEdited(true);
                    flushSave({
                      residual_likelihood: null,
                      residual_consequence: null,
                    });
                  }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear residual
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_DEFS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setEdited(true);
                    flushSave({ status: s.value });
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    risk.status === s.value
                      ? s.colorClass
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export to silence TS unused warnings
export type { RiskLikelihood, RiskConsequence, RiskStatus };
