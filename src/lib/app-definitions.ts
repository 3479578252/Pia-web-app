/**
 * Australian Privacy Principles (APPs) definitions
 * Based on the Privacy Act 1988 (Cth) and OAIC guidance
 */

export interface AppDefinition {
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  keyQuestions: string[];
}

export const APP_DEFINITIONS: AppDefinition[] = [
  {
    number: 1,
    title: "APP 1 — Open and transparent management of personal information",
    shortTitle: "Open & transparent management",
    description:
      "Requires organisations to manage personal information in an open and transparent way, including having a clearly expressed and up-to-date privacy policy.",
    keyQuestions: [
      "Does the project have a privacy policy that covers this new collection/use?",
      "Will the privacy policy need to be updated to reflect this project?",
      "Are there clear internal procedures for managing the personal information?",
    ],
  },
  {
    number: 2,
    title: "APP 2 — Anonymity and pseudonymity",
    shortTitle: "Anonymity & pseudonymity",
    description:
      "Individuals must have the option of not identifying themselves, or of using a pseudonym, unless it is impracticable or required by law.",
    keyQuestions: [
      "Can individuals interact with the project without identifying themselves?",
      "If identification is required, is there a lawful reason for this?",
      "Could a pseudonym be used instead of real identity?",
    ],
  },
  {
    number: 3,
    title: "APP 3 — Collection of solicited personal information",
    shortTitle: "Collection of solicited info",
    description:
      "Personal information must only be collected if it is reasonably necessary for the organisation's functions or activities. Sensitive information requires consent and reasonable necessity.",
    keyQuestions: [
      "Is each item of personal information reasonably necessary for the project?",
      "Is any sensitive information being collected? If so, has consent been obtained?",
      "Is the collection by lawful and fair means?",
    ],
  },
  {
    number: 4,
    title: "APP 4 — Dealing with unsolicited personal information",
    shortTitle: "Unsolicited information",
    description:
      "If an organisation receives personal information it did not solicit, it must determine whether it could have collected it under APP 3. If not, it must destroy or de-identify the information.",
    keyQuestions: [
      "Could the project receive personal information that was not solicited?",
      "Are there procedures to handle unsolicited information appropriately?",
      "Is there a process to destroy or de-identify unsolicited information?",
    ],
  },
  {
    number: 5,
    title: "APP 5 — Notification of the collection of personal information",
    shortTitle: "Notification of collection",
    description:
      "At or before the time of collection, the organisation must notify individuals of certain matters including the purpose of collection, who it may be disclosed to, and how to access or complain.",
    keyQuestions: [
      "Will individuals be notified about what information is collected and why?",
      "Does the notification cover all required matters (purpose, disclosure, access, complaints)?",
      "Is the notification provided at or before the time of collection?",
    ],
  },
  {
    number: 6,
    title: "APP 6 — Use or disclosure of personal information",
    shortTitle: "Use or disclosure",
    description:
      "Personal information must only be used or disclosed for the primary purpose of collection, or a secondary purpose that the individual would reasonably expect (and is related to the primary purpose).",
    keyQuestions: [
      "Will information be used only for the stated purpose of collection?",
      "Are there any secondary uses? Would the individual reasonably expect them?",
      "Is any disclosure to third parties within the scope of the original purpose?",
    ],
  },
  {
    number: 7,
    title: "APP 7 — Direct marketing",
    shortTitle: "Direct marketing",
    description:
      "Personal information must not be used for direct marketing unless certain conditions are met, including providing an opt-out mechanism.",
    keyQuestions: [
      "Will any personal information be used for direct marketing?",
      "If so, is there a simple opt-out mechanism?",
      "Was the information collected directly from the individual?",
    ],
  },
  {
    number: 8,
    title: "APP 8 — Cross-border disclosure of personal information",
    shortTitle: "Cross-border disclosure",
    description:
      "Before disclosing personal information to an overseas recipient, the organisation must take reasonable steps to ensure the recipient complies with the APPs.",
    keyQuestions: [
      "Will any personal information be transferred or accessible overseas?",
      "Are there adequate privacy protections in the receiving country?",
      "Has the organisation taken reasonable steps to ensure overseas compliance?",
    ],
  },
  {
    number: 9,
    title: "APP 9 — Adoption, use or disclosure of government related identifiers",
    shortTitle: "Government identifiers",
    description:
      "Organisations must not adopt, use, or disclose government-related identifiers (e.g. TFN, Medicare number) unless required by law or regulation.",
    keyQuestions: [
      "Does the project collect or use any government-related identifiers?",
      "If so, is the use authorised by law or necessary for verification?",
      "Is the identifier being adopted as the organisation's own identifier?",
    ],
  },
  {
    number: 10,
    title: "APP 10 — Quality of personal information",
    shortTitle: "Quality of information",
    description:
      "Organisations must take reasonable steps to ensure personal information is accurate, up-to-date, complete, and relevant.",
    keyQuestions: [
      "Are there processes to keep information accurate and up-to-date?",
      "How will data quality be maintained over the life of the project?",
      "Are there mechanisms for individuals to correct their information?",
    ],
  },
  {
    number: 11,
    title: "APP 11 — Security of personal information",
    shortTitle: "Security",
    description:
      "Organisations must take reasonable steps to protect personal information from misuse, interference, loss, and unauthorised access, modification, or disclosure.",
    keyQuestions: [
      "What security measures protect the personal information (encryption, access controls)?",
      "Is there a data breach response plan?",
      "Is personal information destroyed or de-identified when no longer needed?",
    ],
  },
  {
    number: 12,
    title: "APP 12 — Access to personal information",
    shortTitle: "Access",
    description:
      "Organisations must give individuals access to their personal information on request, unless an exception applies.",
    keyQuestions: [
      "Can individuals request access to their personal information?",
      "Is there a process to respond to access requests within a reasonable timeframe?",
      "Are there any exceptions that would apply?",
    ],
  },
  {
    number: 13,
    title: "APP 13 — Correction of personal information",
    shortTitle: "Correction",
    description:
      "Organisations must take reasonable steps to correct personal information if it is inaccurate, out-of-date, incomplete, irrelevant, or misleading.",
    keyQuestions: [
      "Can individuals request correction of their personal information?",
      "Is there a process to handle correction requests?",
      "If a correction is refused, is the individual notified and given reasons?",
    ],
  },
];
