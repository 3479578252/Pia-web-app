"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DataFlow } from "@/types/database";
import { saveDataFlow, deleteDataFlow } from "./actions";

interface DataFlowFormProps {
  assessmentId: string;
  assessmentTitle: string;
  existingDataFlows: DataFlow[];
}

interface DataFlowDraft {
  id?: string;
  description: string;
  personal_info_types: string[];
  collection_method: string;
  storage_location: string;
  access_controls: string;
  third_parties: string[];
  retention_period: string;
  disposal_method: string;
}

const EMPTY_FLOW: DataFlowDraft = {
  description: "",
  personal_info_types: [],
  collection_method: "",
  storage_location: "",
  access_controls: "",
  third_parties: [],
  retention_period: "",
  disposal_method: "",
};

const INFO_TYPE_SUGGESTIONS = [
  "Name",
  "Email address",
  "Phone number",
  "Date of birth",
  "Residential address",
  "Government identifier (TFN, Medicare)",
  "Financial information",
  "Health information",
  "Biometric data",
  "Employment information",
  "Location data",
  "IP address",
  "Online identifiers",
];

function flowFromExisting(df: DataFlow): DataFlowDraft {
  return {
    id: df.id,
    description: df.description ?? "",
    personal_info_types: df.personal_info_types ?? [],
    collection_method: df.collection_method ?? "",
    storage_location: df.storage_location ?? "",
    access_controls: df.access_controls ?? "",
    third_parties: df.third_parties ?? [],
    retention_period: df.retention_period ?? "",
    disposal_method: df.disposal_method ?? "",
  };
}

export function DataFlowForm({
  assessmentId,
  assessmentTitle,
  existingDataFlows,
}: DataFlowFormProps) {
  const router = useRouter();
  const [flows, setFlows] = useState<DataFlowDraft[]>(
    existingDataFlows.length > 0
      ? existingDataFlows.map(flowFromExisting)
      : [{ ...EMPTY_FLOW }]
  );
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [infoTypeInput, setInfoTypeInput] = useState("");
  const [thirdPartyInput, setThirdPartyInput] = useState("");

  function updateFlow(index: number, updates: Partial<DataFlowDraft>) {
    setFlows((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
    setSaved(false);
  }

  function addFlow() {
    setFlows((prev) => [...prev, { ...EMPTY_FLOW }]);
    setExpandedIndex(flows.length);
    setSaved(false);
  }

  async function removeFlow(index: number) {
    const flow = flows[index];
    if (flow.id) {
      const result = await deleteDataFlow(flow.id);
      if (result.error) {
        setError(result.error);
        return;
      }
    }
    setFlows((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(Math.max(0, index - 1));
    } else if (expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    setSaved(false);
  }

  function addInfoType(index: number, type: string) {
    const trimmed = type.trim();
    if (!trimmed) return;
    const current = flows[index].personal_info_types;
    if (!current.includes(trimmed)) {
      updateFlow(index, { personal_info_types: [...current, trimmed] });
    }
    setInfoTypeInput("");
  }

  function removeInfoType(flowIndex: number, typeIndex: number) {
    const current = flows[flowIndex].personal_info_types;
    updateFlow(flowIndex, {
      personal_info_types: current.filter((_, i) => i !== typeIndex),
    });
  }

  function addThirdParty(index: number, party: string) {
    const trimmed = party.trim();
    if (!trimmed) return;
    const current = flows[index].third_parties;
    if (!current.includes(trimmed)) {
      updateFlow(index, { third_parties: [...current, trimmed] });
    }
    setThirdPartyInput("");
  }

  function removeThirdParty(flowIndex: number, partyIndex: number) {
    const current = flows[flowIndex].third_parties;
    updateFlow(flowIndex, {
      third_parties: current.filter((_, i) => i !== partyIndex),
    });
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);

    for (const flow of flows) {
      const result = await saveDataFlow(
        assessmentId,
        {
          description: flow.description,
          personal_info_types: flow.personal_info_types,
          collection_method: flow.collection_method,
          storage_location: flow.storage_location,
          access_controls: flow.access_controls,
          third_parties: flow.third_parties,
          retention_period: flow.retention_period,
          disposal_method: flow.disposal_method,
        },
        flow.id
      );

      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/assessments/${assessmentId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {assessmentTitle}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Data Flow Mapping</h1>
        <p className="mt-1 text-muted-foreground">
          Map how personal information flows through your project — from
          collection through to disposal. Add a data flow for each distinct
          stream of personal information.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Data flows saved successfully.
        </div>
      )}

      {/* Data flow entries */}
      <div className="space-y-3">
        {flows.map((flow, index) => (
          <div key={index} className="rounded-lg border overflow-hidden">
            {/* Accordion header */}
            <button
              type="button"
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? -1 : index)
              }
              className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 text-left"
            >
              <span className="text-sm font-medium">
                {flow.description
                  ? flow.description
                  : `Data flow ${index + 1}`}
              </span>
              <div className="flex items-center gap-2">
                {flows.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFlow(index);
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {expandedIndex === index ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Accordion body */}
            {expandedIndex === index && (
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={flow.description}
                    onChange={(e) =>
                      updateFlow(index, { description: e.target.value })
                    }
                    placeholder="e.g. Customer registration data"
                  />
                </div>

                {/* Personal info types — tag input */}
                <div className="space-y-2">
                  <Label>Types of personal information collected</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {flow.personal_info_types.map((type, ti) => (
                      <span
                        key={ti}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {type}
                        <button
                          type="button"
                          onClick={() => removeInfoType(index, ti)}
                          className="hover:text-destructive"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={infoTypeInput}
                      onChange={(e) => setInfoTypeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addInfoType(index, infoTypeInput);
                        }
                      }}
                      placeholder="Type and press Enter, or select below"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addInfoType(index, infoTypeInput)}
                      disabled={!infoTypeInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {INFO_TYPE_SUGGESTIONS.filter(
                      (s) => !flow.personal_info_types.includes(s)
                    ).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addInfoType(index, suggestion)}
                        className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Collection method</Label>
                  <Input
                    value={flow.collection_method}
                    onChange={(e) =>
                      updateFlow(index, { collection_method: e.target.value })
                    }
                    placeholder="e.g. Online form, phone interview, third-party API"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Storage location</Label>
                  <Input
                    value={flow.storage_location}
                    onChange={(e) =>
                      updateFlow(index, { storage_location: e.target.value })
                    }
                    placeholder="e.g. AWS Sydney region, on-premises server"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Access controls</Label>
                  <Textarea
                    value={flow.access_controls}
                    onChange={(e) =>
                      updateFlow(index, { access_controls: e.target.value })
                    }
                    placeholder="Who can access this data and how is access controlled?"
                    rows={2}
                  />
                </div>

                {/* Third parties — tag input */}
                <div className="space-y-2">
                  <Label>Third parties with access</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {flow.third_parties.map((party, pi) => (
                      <span
                        key={pi}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                      >
                        {party}
                        <button
                          type="button"
                          onClick={() => removeThirdParty(index, pi)}
                          className="hover:text-destructive"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={thirdPartyInput}
                      onChange={(e) => setThirdPartyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addThirdParty(index, thirdPartyInput);
                        }
                      }}
                      placeholder="e.g. Payment processor, cloud provider"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addThirdParty(index, thirdPartyInput)}
                      disabled={!thirdPartyInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Retention period</Label>
                    <Input
                      value={flow.retention_period}
                      onChange={(e) =>
                        updateFlow(index, { retention_period: e.target.value })
                      }
                      placeholder="e.g. 7 years, duration of contract"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Disposal method</Label>
                    <Input
                      value={flow.disposal_method}
                      onChange={(e) =>
                        updateFlow(index, { disposal_method: e.target.value })
                      }
                      placeholder="e.g. Secure deletion, de-identification"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addFlow}
        className="mt-3 w-full"
      >
        <Plus className="mr-1 h-4 w-4" />
        Add another data flow
      </Button>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {flows.length} data flow{flows.length !== 1 ? "s" : ""}
          </span>
          <Button onClick={handleSaveAll} disabled={saving} size="sm">
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving..." : "Save all"}
          </Button>
        </div>
      </div>
    </div>
  );
}
