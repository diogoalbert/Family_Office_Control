export type InternalQuestionTemplate = {
  code: string;
  dueWeek: number;
  owner: string;
  workstream: string;
  question: string;
  requiredSources: string;
  outputFormat: string;
};

export const INTERNAL_QUESTIONS: InternalQuestionTemplate[] = [
  {
    code: "W1-1",
    dueWeek: 1,
    owner: "Michalis / all",
    workstream: "Project controls + evidence discipline",
    question:
      "What is the minimum decision log + board pack standard we will enforce from Day 1 to prevent place-of-effective-management drift to Portugal? What goes into each pack and who signs what, where?",
    requiredSources: "Roadmap; Cyprus corporate governance evidence norms; internal templates",
    outputFormat: "Project file set-up + one-page evidence rules",
  },
  {
    code: "W1-2",
    dueWeek: 1,
    owner: "Diogo / Gonçalo",
    workstream: "Assumptions + Portugal guardrails",
    question:
      "Confirm the client’s exact NHR position and the conditions required to keep foreign dividend treatment clean in Portugal. What red-line facts would break this treatment?",
    requiredSources: "CIRS; Portugal-Cyprus DTA; OECD Model references",
    outputFormat: "Assumptions register + first-pass Portugal guardrails",
  },
  {
    code: "W1-3",
    dueWeek: 1,
    owner: "Gonçalo / Diogo",
    workstream: "Client control map",
    question:
      "What are the client’s non-negotiables on control, and which powers must sit away from him to avoid alter-ego and tax residence drift? Draft a control rights matrix.",
    requiredSources: "Roadmap; control vs economics split memo; governance norms",
    outputFormat: "Information request addendum + control rights matrix",
  },
  {
    code: "W1-4",
    dueWeek: 1,
    owner: "Diogo / Michalis",
    workstream: "Client inputs (tax + operational)",
    question:
      "What is the minimum factual perimeter to collect in Week 1 to avoid rework in Week 3 (assets, exchange history, wallets, pledges, banking appetite, succession preferences)?",
    requiredSources: "Roadmap inputs list",
    outputFormat: "Structured questionnaire + document list",
  },
  {
    code: "W2-1",
    dueWeek: 2,
    owner: "Diogo / Michalis",
    workstream: "As-is map: Portugal baseline + cashflow taxonomy",
    question:
      "For likely cashflow routes (dividends, interest, gains, loan proceeds, return of capital, trust distributions), how will Portugal classify each and what is the default tax/reporting profile?",
    requiredSources: "CIRS; reporting rules; DTA; dividend vs trust distribution logic",
    outputFormat: "Portugal baseline memo + cashflow taxonomy table",
  },
  {
    code: "W2-2",
    dueWeek: 2,
    owner: "Diogo / Gonçalo",
    workstream: "Treaty characterisation (trust distributions)",
    question:
      "Does the Portugal-Cyprus DTA change the analysis for trust distributions, including Other Income framing, and provide practical relief?",
    requiredSources: "Portugal-Cyprus DTA; OECD Model + Commentary",
    outputFormat: "Internal treaty note with clear conclusion",
  },
  {
    code: "W2-3",
    dueWeek: 2,
    owner: "Michalis / Diogo",
    workstream: "Cyprus baseline: management/control evidence plan",
    question:
      "What is the minimum viable Cyprus substance for this platform to look like an investment office while staying outside regulated activity boundaries?",
    requiredSources: "Cyprus tax residence guidance; EU/EEA substance expectations",
    outputFormat: "Cyprus substance baseline + evidencing checklist",
  },
  {
    code: "W2-4",
    dueWeek: 2,
    owner: "Diogo / Michalis",
    workstream: "Portugal-facing red flag map",
    question:
      "For this client profile, what are the top Portugal challenge narratives to pre-empt (CFC, GAAR, beneficial ownership, disguised distribution, management in Portugal)? Rank by impact and likelihood.",
    requiredSources: "CIRS/CIRC; LGT; roadmap risk controls",
    outputFormat: "Red-flag list + evidence-to-rebut column",
  },
  {
    code: "W3-1",
    dueWeek: 3,
    owner: "Gonçalo / Diogo + Michalis",
    workstream: "Architecture option set",
    question:
      "Compare Portuguese tax consequences and audit optics for dual-class shares vs trust owning 100% with lifestyle funded by loans. Provide ranking, risk grading and what-could-go-wrong list.",
    requiredSources: "CIRS; DTA; OECD; architecture options memo",
    outputFormat: "Option ranking table + recommendation",
  },
  {
    code: "W3-2",
    dueWeek: 3,
    owner: "Diogo / Gonçalo",
    workstream: "Alternative fiduciary form",
    question:
      "If a foundation is used above Cyprus HoldCo, what changes in Portuguese tax characterisation risk versus Cyprus trust + PTC?",
    requiredSources: "Foundation law summaries; Portuguese tax classification",
    outputFormat: "Options note + decision matrix",
  },
  {
    code: "W4-1",
    dueWeek: 4,
    owner: "Gonçalo + Michalis",
    workstream: "Liquidity toolkit documentation stack",
    question:
      "Draft documentation stack for HoldCo-level Lombard facility, downstream loans and family liquidity line policy with approvals, covenants and repayment mechanics.",
    requiredSources: "Roadmap liquidity objectives; private banking norms",
    outputFormat: "Liquidity toolkit pack v1",
  },
  {
    code: "W4-2",
    dueWeek: 4,
    owner: "Michalis / Gonçalo",
    workstream: "Operating rules and enforcement",
    question:
      "Define enforceable operating rules that prevent the structure from being administered as a personal wallet.",
    requiredSources: "Roadmap governance posture; governance controls",
    outputFormat: "Operating rules one-pager + enforcement checklist",
  },
  {
    code: "W5-1",
    dueWeek: 5,
    owner: "Gonçalo / Managing Partner",
    workstream: "Client pack narrative and defensibility",
    question:
      "Draft the core narrative for why the trust/foundation exists and why it is not a routine paymaster into Portugal, aligned with cashflow routes and evidence trail.",
    requiredSources: "Reorganised memo findings; roadmap client deliverables",
    outputFormat: "Client pack narrative + language discipline list",
  },
  {
    code: "W5-2",
    dueWeek: 5,
    owner: "Diogo / Managing Partner",
    workstream: "Red-team: Portugal audit simulation",
    question:
      "Prepare hard questions the client must answer in a Portugal audit (source of funds, control, Cyprus rationale, limited distributions, prudent borrowing, evidence trail).",
    requiredSources: "CIRS/LGT; roadmap risk controls; red-flag logic",
    outputFormat: "Hard questions list + evidence cross-reference",
  },
  {
    code: "W6-1",
    dueWeek: 6,
    owner: "Managing Partner / all",
    workstream: "Final decision set and Phase 2 sequencing",
    question:
      "Provide final client decision points and a Phase 2 implementation sequence that preserves bankability and evidencing standards.",
    requiredSources: "Phase 2 roadmap; provider availability; onboarding constraints",
    outputFormat: "Final decision grid + Phase 2 roadmap v1",
  },
];

