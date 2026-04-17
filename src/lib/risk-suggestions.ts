import type {
  AppAnalysis,
  DataFlow,
  Risk,
  RiskLikelihood,
  RiskConsequence,
} from "@/types/database";

export interface RiskSuggestion {
  description: string;
  category: string;
  likelihood: RiskLikelihood;
  consequence: RiskConsequence;
  mitigation: string;
  source: string; // short label showing where it came from
}

const SENSITIVE_TERMS = [
  "health",
  "biometric",
  "genetic",
  "racial",
  "religious",
  "sexual",
  "criminal",
  "political",
  "union",
];

const GOVT_ID_TERMS = ["tfn", "medicare", "passport", "licence", "license"];

function includesAny(haystack: string, terms: string[]): boolean {
  const lower = haystack.toLowerCase();
  return terms.some((t) => lower.includes(t));
}

function isOverseas(location: string): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  const aussieHints = [
    "australia",
    "sydney",
    "melbourne",
    "brisbane",
    "perth",
    "adelaide",
    "canberra",
    "hobart",
    "darwin",
    "on-premises",
    "on premises",
    "on-prem",
  ];
  const overseasHints = [
    "us ",
    "usa",
    "united states",
    "europe",
    "eu ",
    "singapore",
    "asia",
    "india",
    "china",
    "japan",
    "uk ",
    "united kingdom",
    "ireland",
    "germany",
    "canada",
    "overseas",
    "offshore",
    "global",
  ];
  if (overseasHints.some((h) => lower.includes(h))) return true;
  if (aussieHints.some((h) => lower.includes(h))) return false;
  return false;
}

function suggestionsFromDataFlow(df: DataFlow): RiskSuggestion[] {
  const out: RiskSuggestion[] = [];
  const infoTypesJoined = df.personal_info_types.join(" ");

  // Sensitive information
  if (includesAny(infoTypesJoined, SENSITIVE_TERMS)) {
    out.push({
      description: `Handling of sensitive information (${df.personal_info_types
        .filter((t) => includesAny(t, SENSITIVE_TERMS))
        .join(", ")}) in "${df.description || "data flow"}" requires heightened protection under APP 3 and APP 11.`,
      category: "Sensitive info handling",
      likelihood: "likely",
      consequence: "major",
      mitigation:
        "Obtain explicit consent; apply stronger access controls and encryption; restrict collection to what is strictly necessary.",
      source: `Data flow: ${df.description || "(unnamed)"}`,
    });
  }

  // Government identifiers
  if (includesAny(infoTypesJoined, GOVT_ID_TERMS)) {
    out.push({
      description: `Collection or use of government-related identifiers in "${df.description || "data flow"}" may breach APP 9.`,
      category: "Government identifiers (APP 9)",
      likelihood: "possible",
      consequence: "major",
      mitigation:
        "Only adopt, use, or disclose government identifiers where required/authorised by law; do not use as the organisation's primary identifier.",
      source: `Data flow: ${df.description || "(unnamed)"}`,
    });
  }

  // Overseas storage
  if (df.storage_location && isOverseas(df.storage_location)) {
    out.push({
      description: `Personal information is stored or processed overseas (${df.storage_location}) in "${df.description || "data flow"}", triggering APP 8 obligations.`,
      category: "Cross-border transfer (APP 8)",
      likelihood: "likely",
      consequence: "major",
      mitigation:
        "Ensure overseas recipients are bound by comparable privacy obligations; include contractual safeguards; conduct a cross-border disclosure assessment.",
      source: `Data flow: ${df.description || "(unnamed)"}`,
    });
  }

  // Third parties
  if (df.third_parties.length > 0) {
    out.push({
      description: `Personal information is disclosed to third parties (${df.third_parties.join(", ")}) in "${df.description || "data flow"}".`,
      category: "Third-party sharing",
      likelihood: "possible",
      consequence: "moderate",
      mitigation:
        "Ensure contracts include privacy obligations; audit third-party handling; minimise data shared to what is necessary.",
      source: `Data flow: ${df.description || "(unnamed)"}`,
    });
  }

  // Retention unclear or very long
  if (!df.retention_period || df.retention_period.trim().length === 0) {
    out.push({
      description: `No retention period specified for "${df.description || "data flow"}". Indefinite retention breaches APP 11.2.`,
      category: "Over-retention",
      likelihood: "likely",
      consequence: "moderate",
      mitigation:
        "Define and document a retention schedule; implement automated deletion or de-identification when purpose is fulfilled.",
      source: `Data flow: ${df.description || "(unnamed)"}`,
    });
  }

  // Disposal unclear
  if (!df.disposal_method || df.disposal_method.trim().length === 0) {
    out.push({
      description: `No disposal method specified for "${df.description || "data flow"}". Risk of data leak or unauthorised access to residual data.`,
      category: "Data breach",
      likelihood: "possible",
      consequence: "major",
      mitigation:
        "Document and apply secure disposal (deletion or de-identification); verify with periodic audit.",
      source: `Data flow: ${df.description || "(unnamed)"}`,
    });
  }

  return out;
}

const APP_TO_CATEGORY: Record<number, { category: string; label: string }> = {
  1: { category: "Access/correction rights", label: "APP 1 — Transparent management" },
  2: { category: "Over-collection", label: "APP 2 — Anonymity" },
  3: { category: "Over-collection", label: "APP 3 — Collection" },
  4: { category: "Data breach", label: "APP 4 — Unsolicited info" },
  5: { category: "Inadequate notification (APP 5)", label: "APP 5 — Notification" },
  6: { category: "Secondary use/disclosure", label: "APP 6 — Use or disclosure" },
  7: { category: "Secondary use/disclosure", label: "APP 7 — Direct marketing" },
  8: { category: "Cross-border transfer (APP 8)", label: "APP 8 — Cross-border" },
  9: { category: "Government identifiers (APP 9)", label: "APP 9 — Government IDs" },
  10: { category: "Data quality", label: "APP 10 — Quality" },
  11: { category: "Weak security (APP 11)", label: "APP 11 — Security" },
  12: { category: "Access/correction rights", label: "APP 12 — Access" },
  13: { category: "Access/correction rights", label: "APP 13 — Correction" },
};

function suggestionsFromAppAnalysis(a: AppAnalysis): RiskSuggestion[] {
  if (
    a.compliance_status !== "non_compliant" &&
    a.compliance_status !== "partially_compliant"
  ) {
    return [];
  }

  const mapping = APP_TO_CATEGORY[a.app_number];
  if (!mapping) return [];

  const nonCompliant = a.compliance_status === "non_compliant";

  const baseDescription = a.findings
    ? a.findings
    : `Compliance gap identified for ${mapping.label}.`;

  return [
    {
      description: baseDescription,
      category: mapping.category,
      likelihood: nonCompliant ? "likely" : "possible",
      consequence: nonCompliant ? "major" : "moderate",
      mitigation:
        a.recommendations ||
        `Address ${mapping.label} compliance gap with appropriate controls and documentation.`,
      source: `${mapping.label} (${nonCompliant ? "Non-compliant" : "Partially compliant"})`,
    },
  ];
}

function isDuplicate(suggestion: RiskSuggestion, existing: Risk[]): boolean {
  // Match by category + substring overlap in description
  const suggestKey = (suggestion.category + " " + suggestion.description)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "");
  return existing.some((r) => {
    if (r.category !== suggestion.category) return false;
    const existingKey = (r.description || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "");
    // Short fingerprint overlap — pick first 30 chars of the description
    const fingerprint = suggestKey.slice(0, 30);
    return fingerprint.length > 0 && existingKey.includes(fingerprint);
  });
}

export function generateRiskSuggestions(
  dataFlows: DataFlow[],
  analyses: AppAnalysis[],
  existingRisks: Risk[]
): RiskSuggestion[] {
  const all: RiskSuggestion[] = [
    ...dataFlows.flatMap(suggestionsFromDataFlow),
    ...analyses.flatMap(suggestionsFromAppAnalysis),
  ];

  // Filter duplicates against existing risks and against other suggestions
  const deduped: RiskSuggestion[] = [];
  for (const s of all) {
    if (isDuplicate(s, existingRisks)) continue;
    // Avoid duplicates within the suggestion set itself
    const already = deduped.some(
      (d) =>
        d.category === s.category &&
        d.description.slice(0, 40) === s.description.slice(0, 40)
    );
    if (already) continue;
    deduped.push(s);
  }

  return deduped;
}
