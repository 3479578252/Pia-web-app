import type { RiskLikelihood, RiskConsequence, RiskStatus } from "@/types/database";

export interface LikelihoodDef {
  value: RiskLikelihood;
  label: string;
  score: number;
  description: string;
}

export interface ConsequenceDef {
  value: RiskConsequence;
  label: string;
  score: number;
  description: string;
}

export interface StatusDef {
  value: RiskStatus;
  label: string;
  colorClass: string;
}

export const LIKELIHOOD_DEFS: LikelihoodDef[] = [
  {
    value: "rare",
    label: "Rare",
    score: 1,
    description: "May occur only in exceptional circumstances (< once per 10 years).",
  },
  {
    value: "unlikely",
    label: "Unlikely",
    score: 2,
    description: "Could occur at some time (once in 2-10 years).",
  },
  {
    value: "possible",
    label: "Possible",
    score: 3,
    description: "Might occur at some time (once in 1-2 years).",
  },
  {
    value: "likely",
    label: "Likely",
    score: 4,
    description: "Will probably occur in most circumstances (multiple times per year).",
  },
  {
    value: "almost_certain",
    label: "Almost Certain",
    score: 5,
    description: "Expected to occur regularly (ongoing, frequent).",
  },
];

export const CONSEQUENCE_DEFS: ConsequenceDef[] = [
  {
    value: "insignificant",
    label: "Insignificant",
    score: 1,
    description: "Minimal impact; no individuals meaningfully affected; no reputational damage.",
  },
  {
    value: "minor",
    label: "Minor",
    score: 2,
    description: "Limited impact on few individuals; minor remediation; contained within organisation.",
  },
  {
    value: "moderate",
    label: "Moderate",
    score: 3,
    description: "Notable impact; some individuals affected; regulatory attention possible.",
  },
  {
    value: "major",
    label: "Major",
    score: 4,
    description: "Significant harm; notifiable data breach; regulatory action likely.",
  },
  {
    value: "catastrophic",
    label: "Catastrophic",
    score: 5,
    description: "Widespread harm; major regulatory penalty; serious reputational damage.",
  },
];

export const STATUS_DEFS: StatusDef[] = [
  { value: "identified", label: "Identified", colorClass: "bg-slate-500 text-white" },
  { value: "mitigating", label: "Mitigating", colorClass: "bg-amber-500 text-white" },
  { value: "accepted", label: "Accepted", colorClass: "bg-blue-500 text-white" },
  { value: "resolved", label: "Resolved", colorClass: "bg-green-600 text-white" },
];

export const RISK_CATEGORIES: string[] = [
  "Data breach",
  "Unauthorised access",
  "Over-collection",
  "Inadequate notification (APP 5)",
  "Secondary use/disclosure",
  "Cross-border transfer (APP 8)",
  "Weak security (APP 11)",
  "Over-retention",
  "Access/correction rights",
  "Third-party sharing",
  "Sensitive info handling",
  "Government identifiers (APP 9)",
  "Data quality",
  "Profiling/automated decisions",
];

export function likelihoodScore(l: RiskLikelihood): number {
  return LIKELIHOOD_DEFS.find((d) => d.value === l)?.score ?? 3;
}

export function consequenceScore(c: RiskConsequence): number {
  return CONSEQUENCE_DEFS.find((d) => d.value === c)?.score ?? 3;
}

export function riskScore(l: RiskLikelihood, c: RiskConsequence): number {
  return likelihoodScore(l) * consequenceScore(c);
}

export interface RiskLevel {
  label: string;
  bg: string;
  text: string;
  border: string;
  hex: string;
}

export function riskLevel(score: number): RiskLevel {
  if (score <= 4) {
    return {
      label: "Low",
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
      hex: "#86efac",
    };
  }
  if (score <= 9) {
    return {
      label: "Moderate",
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
      hex: "#fde047",
    };
  }
  if (score <= 14) {
    return {
      label: "High",
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-300",
      hex: "#fdba74",
    };
  }
  if (score <= 19) {
    return {
      label: "Very High",
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
      hex: "#fca5a5",
    };
  }
  return {
    label: "Extreme",
    bg: "bg-red-200",
    text: "text-red-900",
    border: "border-red-400",
    hex: "#ef4444",
  };
}
