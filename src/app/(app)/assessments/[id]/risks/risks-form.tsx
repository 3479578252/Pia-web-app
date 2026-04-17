"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_DEFS, RISK_CATEGORIES } from "@/lib/risk-definitions";
import {
  generateRiskSuggestions,
  type RiskSuggestion,
} from "@/lib/risk-suggestions";
import type {
  Risk,
  AppAnalysis,
  DataFlow,
  RiskStatus,
} from "@/types/database";
import {
  createRisk,
  updateRisk,
  deleteRisk,
  createManyRisks,
} from "./actions";
import { RiskCard } from "./risk-card";
import { OverviewMatrix } from "./risk-matrix";

interface RisksFormProps {
  assessmentId: string;
  assessmentTitle: string;
  initialRisks: Risk[];
  dataFlows: DataFlow[];
  appAnalyses: AppAnalysis[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ViewMode = "list" | "matrix";
type SortMode = "score" | "category" | "status";

export function RisksForm({
  assessmentId,
  assessmentTitle,
  initialRisks,
  dataFlows,
  appAnalyses,
}: RisksFormProps) {
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterStatus, setFilterStatus] = useState<RiskStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [isPending, startTransition] = useTransition();
  const autoImportedRef = useRef(initialRisks.length > 0);

  const suggestions = useMemo(
    () => generateRiskSuggestions(dataFlows, appAnalyses, risks),
    [dataFlows, appAnalyses, risks]
  );

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedSuggestions.has(suggestionKey(s))
  );

  const hasUpstream = dataFlows.length > 0 || appAnalyses.length > 0;

  const filteredRisks = useMemo(() => {
    let filtered = [...risks];
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }
    if (filterCategory !== "all") {
      filtered = filtered.filter((r) => r.category === filterCategory);
    }
    if (sortMode === "score") {
      filtered.sort((a, b) => b.risk_score - a.risk_score);
    } else if (sortMode === "category") {
      filtered.sort((a, b) =>
        (a.category || "").localeCompare(b.category || "")
      );
    } else if (sortMode === "status") {
      filtered.sort((a, b) => a.status.localeCompare(b.status));
    }
    return filtered;
  }, [risks, filterStatus, filterCategory, sortMode]);

  const categoryOptions = useMemo(() => {
    const fromRisks = new Set(risks.map((r) => r.category).filter(Boolean));
    return Array.from(new Set([...RISK_CATEGORIES, ...fromRisks])) as string[];
  }, [risks]);

  // Auto-import suggestions on first mount if register is empty
  useEffect(() => {
    if (autoImportedRef.current) return;
    if (initialRisks.length > 0) return;
    const initial = generateRiskSuggestions(dataFlows, appAnalyses, []);
    if (initial.length === 0) return;
    autoImportedRef.current = true;
    void applySuggestions(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setStatus(s: SaveStatus) {
    setSaveStatus(s);
    if (s === "saved") {
      setTimeout(() => {
        setSaveStatus((current) => (current === "saved" ? "idle" : current));
      }, 1500);
    }
  }

  async function handleCreateBlank() {
    setStatus("saving");
    const result = await createRisk(assessmentId, {
      description: "",
      category: null,
      likelihood: "possible",
      consequence: "moderate",
      mitigation: null,
      residual_likelihood: null,
      residual_consequence: null,
      status: "identified",
      ai_suggested: false,
    });
    if (result.error || !result.risk) {
      setSaveError(result.error ?? "Failed to create risk");
      setStatus("error");
      return;
    }
    setRisks((prev) => [result.risk!, ...prev]);
    setExpandedIds((prev) => new Set([result.risk!.id, ...prev]));
    setStatus("saved");
  }

  async function applySuggestions(list: RiskSuggestion[]) {
    if (list.length === 0) return;
    setStatus("saving");
    const result = await createManyRisks(
      assessmentId,
      list.map((s) => ({
        description: s.description,
        category: s.category,
        likelihood: s.likelihood,
        consequence: s.consequence,
        mitigation: s.mitigation,
        residual_likelihood: null,
        residual_consequence: null,
        status: "identified",
        ai_suggested: true,
      }))
    );
    if (result.error || !result.risks) {
      setSaveError(result.error ?? "Failed to import suggestions");
      setStatus("error");
      return;
    }
    setRisks((prev) =>
      [...result.risks!, ...prev].sort((a, b) => b.risk_score - a.risk_score)
    );
    setStatus("saved");
  }

  async function handleAddSuggestion(s: RiskSuggestion) {
    setDismissedSuggestions((prev) => new Set([...prev, suggestionKey(s)]));
    await applySuggestions([s]);
  }

  function handleDismissSuggestion(s: RiskSuggestion) {
    setDismissedSuggestions((prev) => new Set([...prev, suggestionKey(s)]));
  }

  async function handleAddAllSuggestions() {
    const toAdd = visibleSuggestions;
    setDismissedSuggestions((prev) => {
      const next = new Set(prev);
      for (const s of toAdd) next.add(suggestionKey(s));
      return next;
    });
    await applySuggestions(toAdd);
  }

  async function handleRiskChange(riskId: string, updates: Partial<Risk>) {
    // Optimistic update
    setRisks((prev) =>
      prev.map((r) => (r.id === riskId ? { ...r, ...updates } : r))
    );
    setStatus("saving");
    startTransition(async () => {
      const fd = {
        ...(updates.description !== undefined && {
          description: updates.description,
        }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.likelihood !== undefined && {
          likelihood: updates.likelihood,
        }),
        ...(updates.consequence !== undefined && {
          consequence: updates.consequence,
        }),
        ...(updates.mitigation !== undefined && {
          mitigation: updates.mitigation,
        }),
        ...(updates.residual_likelihood !== undefined && {
          residual_likelihood: updates.residual_likelihood,
        }),
        ...(updates.residual_consequence !== undefined && {
          residual_consequence: updates.residual_consequence,
        }),
        ...(updates.status !== undefined && { status: updates.status }),
      };
      const result = await updateRisk(riskId, fd);
      if (result.error) {
        setSaveError(result.error);
        setStatus("error");
        return;
      }
      // Refresh computed risk_score from backend if likelihood/consequence changed
      if (
        updates.likelihood !== undefined ||
        updates.consequence !== undefined
      ) {
        setRisks((prev) =>
          prev.map((r) => {
            if (r.id !== riskId) return r;
            const l = updates.likelihood ?? r.likelihood;
            const c = updates.consequence ?? r.consequence;
            const lScore =
              { rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5 }[l];
            const cScore =
              { insignificant: 1, minor: 2, moderate: 3, major: 4, catastrophic: 5 }[c];
            return { ...r, risk_score: lScore * cScore };
          })
        );
      }
      setStatus("saved");
    });
  }

  async function handleDeleteRisk(riskId: string) {
    setStatus("saving");
    const result = await deleteRisk(riskId);
    if (result.error) {
      setSaveError(result.error);
      setStatus("error");
      return;
    }
    setRisks((prev) => prev.filter((r) => r.id !== riskId));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(riskId);
      return next;
    });
    setStatus("saved");
  }

  function toggleExpand(riskId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(riskId)) next.delete(riskId);
      else next.add(riskId);
      return next;
    });
  }

  function handleDotClick(riskId: string) {
    setViewMode("list");
    setExpandedIds((prev) => new Set([...prev, riskId]));
    // Allow state update, then scroll
    setTimeout(() => {
      const el = document.getElementById(`risk-${riskId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  const saveIndicator = (() => {
    if (saveStatus === "saving" || isPending) return "Saving…";
    if (saveStatus === "saved") return "All changes saved";
    if (saveStatus === "error") return `Error: ${saveError}`;
    return risks.length === 0 ? "No risks yet" : "All changes saved";
  })();

  const saveIndicatorClass =
    saveStatus === "error"
      ? "text-destructive"
      : saveStatus === "saving" || isPending
        ? "text-muted-foreground"
        : "text-muted-foreground";

  return (
    <div className="mx-auto max-w-4xl pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/assessments/${assessmentId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {assessmentTitle}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Risk Register</h1>
        <p className="mt-1 text-muted-foreground">
          Identify, rate, and plan mitigations for privacy risks. Click a
          matrix cell to set likelihood × consequence.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="mb-4 flex items-center gap-1 border-b">
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium -mb-px transition-colors ${
            viewMode === "list"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-4 w-4" />
          List
        </button>
        <button
          type="button"
          onClick={() => setViewMode("matrix")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium -mb-px transition-colors ${
            viewMode === "matrix"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Matrix overview
        </button>
      </div>

      {/* Upstream hint */}
      {!hasUpstream && (
        <div className="mb-4 rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
          <strong>Tip:</strong> Complete{" "}
          <Link
            href={`/assessments/${assessmentId}/data-flow`}
            className="underline hover:text-foreground"
          >
            Data Flow Mapping
          </Link>{" "}
          and{" "}
          <Link
            href={`/assessments/${assessmentId}/app-analysis`}
            className="underline hover:text-foreground"
          >
            APP Analysis
          </Link>{" "}
          first — we&apos;ll suggest relevant risks automatically based on what
          you&apos;ve entered.
        </div>
      )}

      {viewMode === "list" && (
        <>
          {/* Filters + sort */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status:
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as RiskStatus | "all")
                }
                className="h-7 rounded border border-input bg-transparent px-2 text-xs"
              >
                <option value="all">All</option>
                {STATUS_DEFS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Category:
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-7 rounded border border-input bg-transparent px-2 text-xs max-w-[200px]"
              >
                <option value="all">All</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Sort:
              </label>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-7 rounded border border-input bg-transparent px-2 text-xs"
              >
                <option value="score">Risk score (high → low)</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
              </select>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredRisks.length} of {risks.length} risks
            </span>
          </div>

          {/* Suggestions section */}
          {visibleSuggestions.length > 0 && (
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <h2 className="text-sm font-semibold text-purple-900">
                    Suggested risks ({visibleSuggestions.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAllSuggestions}
                    disabled={isPending}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Add all
                  </Button>
                </div>
              </div>
              <p className="mb-3 text-xs text-purple-800">
                Derived from your Data Flow Mapping and APP Analysis. Review
                each, then add to your register.
              </p>
              <div className="space-y-2">
                {visibleSuggestions.map((s) => (
                  <div
                    key={suggestionKey(s)}
                    className="flex items-start gap-3 rounded-md bg-white/70 p-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {s.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.source}
                        </span>
                      </div>
                      <p className="text-sm">{s.description}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismissSuggestion(s)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddSuggestion(s)}
                        disabled={isPending}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk cards */}
          {filteredRisks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {risks.length === 0
                ? "No risks yet. Add one below, or use Suggestions above."
                : "No risks match the current filters."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRisks.map((risk) => (
                <RiskCard
                  key={risk.id}
                  risk={risk}
                  expanded={expandedIds.has(risk.id)}
                  onToggleExpand={() => toggleExpand(risk.id)}
                  onDelete={() => handleDeleteRisk(risk.id)}
                  onChange={(updates) => handleRiskChange(risk.id, updates)}
                />
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleCreateBlank}
            className="mt-3 w-full"
            disabled={isPending}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add risk
          </Button>
        </>
      )}

      {viewMode === "matrix" && (
        <div className="rounded-lg border p-4">
          {risks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No risks to plot yet.
            </div>
          ) : (
            <OverviewMatrix
              risks={risks.map((r) => ({
                id: r.id,
                description: r.description,
                likelihood: r.likelihood,
                consequence: r.consequence,
                ai_suggested: r.ai_suggested,
              }))}
              onDotClick={handleDotClick}
            />
          )}
        </div>
      )}

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className={`text-sm ${saveIndicatorClass}`}>
            {saveIndicator}
          </span>
          <span className="text-xs text-muted-foreground">
            {risks.length} risk{risks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function suggestionKey(s: RiskSuggestion): string {
  return `${s.category}::${s.description.slice(0, 80)}`;
}
