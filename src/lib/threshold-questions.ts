import type { ThresholdResult } from "@/types/database";

export interface ThresholdQuestion {
  id: string;
  text: string;
  helpText: string;
  category: "high_risk" | "standard";
  source: string;
}

export const THRESHOLD_QUESTIONS: ThresholdQuestion[] = [
  // High-risk triggers (any "yes" → full_pia_required)
  {
    id: "q1_sensitive_info",
    text: "Does the project involve collecting, using, or disclosing sensitive information?",
    helpText:
      "Sensitive information includes health, biometric, racial or ethnic origin, political opinions, religious beliefs, sexual orientation, criminal record, or trade union membership.",
    category: "high_risk",
    source: "APP 3.3, s13 Privacy Act 1988",
  },
  {
    id: "q2_profiling_ai",
    text: "Does the project involve profiling, automated decision-making, or AI/machine learning applied to personal information?",
    helpText:
      "This includes algorithmic decision-making that affects individuals, risk scoring, behavioural analysis, or using AI to process personal data.",
    category: "high_risk",
    source: "OAIC AI guidance, NSW IPC",
  },
  {
    id: "q3_surveillance",
    text: "Does the project involve systematic monitoring, surveillance, or tracking of individuals?",
    helpText:
      "Examples include CCTV, location tracking, employee monitoring, online behaviour tracking, or workplace surveillance systems.",
    category: "high_risk",
    source: "OAIC PIA Guide Step 2",
  },
  {
    id: "q4_overseas",
    text: "Will personal information be disclosed to overseas recipients or stored/processed outside Australia, in a region or zone that does not have similar privacy protections to Australia?",
    helpText:
      "Consider whether data will be sent to, accessed from, or stored in countries without substantially similar privacy laws (e.g. no equivalent to the Privacy Act 1988).",
    category: "high_risk",
    source: "APP 8",
  },
  {
    id: "q5_data_matching",
    text: "Does the project involve matching, linking, or combining personal information from multiple sources or datasets that were collected for different purposes?",
    helpText:
      "This includes merging databases, data enrichment from third parties, or cross-referencing records originally collected under separate consent.",
    category: "high_risk",
    source: "OAIC data matching guidelines",
  },
  {
    id: "q6_vulnerable",
    text: "Will the project handle personal information of vulnerable individuals?",
    helpText:
      "Vulnerable individuals include children, elderly persons, people with disabilities, Indigenous Australians, or others in circumstances of vulnerability.",
    category: "high_risk",
    source: "OAIC, Victorian OVIC",
  },
  // Standard questions (2+ "yes" with no high-risk → pia_recommended)
  {
    id: "q7_new_collection",
    text: "Does the project involve new or significantly changed collection, use, or disclosure of personal information?",
    helpText:
      "Consider whether you are collecting new types of personal information, using it for new purposes, or disclosing it to new recipients.",
    category: "standard",
    source: "OAIC PIA Guide Step 2",
  },
  {
    id: "q8_large_scale",
    text: "Does the project involve large-scale collection or processing of personal information?",
    helpText:
      "Consider whether the project will affect a large number of individuals (e.g. more than 5,000) or involve significant volumes of personal data.",
    category: "standard",
    source: "OAIC PIA Guide",
  },
  {
    id: "q9_new_technology",
    text: "Will the project introduce a new technology, system, or platform for handling personal information?",
    helpText:
      "This includes new software, cloud services, databases, or any technology change that affects how personal information is handled.",
    category: "standard",
    source: "OAIC PIA Guide Step 2",
  },
  {
    id: "q10_public_interaction",
    text: "Does the project change how individuals interact with your organisation?",
    helpText:
      "Examples include new digital services, online portals, mobile apps, or changes to customer-facing processes that involve personal information.",
    category: "standard",
    source: "OAIC PIA Guide",
  },
];

export type ThresholdResponses = Record<string, boolean>;

export function calculateThresholdResult(
  responses: ThresholdResponses
): Exclude<ThresholdResult, "pending"> {
  const highRiskQuestions = THRESHOLD_QUESTIONS.filter(
    (q) => q.category === "high_risk"
  );
  const standardQuestions = THRESHOLD_QUESTIONS.filter(
    (q) => q.category === "standard"
  );

  // Any high-risk "yes" → full_pia_required
  const hasHighRiskYes = highRiskQuestions.some((q) => responses[q.id] === true);
  if (hasHighRiskYes) {
    return "full_pia_required";
  }

  // Count standard "yes" answers
  const standardYesCount = standardQuestions.filter(
    (q) => responses[q.id] === true
  ).length;

  // 2+ standard "yes" → pia_recommended
  if (standardYesCount >= 2) {
    return "pia_recommended";
  }

  // 0-1 standard "yes" → not_required
  return "not_required";
}
