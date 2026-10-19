import { demoClaims, demoReports } from "./data.js";

export const statusMeta = {
  confirmed: {
    label: "Confirmed",
    short: "Confirmed",
    className: "status-confirmed",
  },
  conflicting: {
    label: "Conflicting",
    short: "Conflict",
    className: "status-conflicting",
  },
  unverified: {
    label: "Unverified",
    short: "Unverified",
    className: "status-unverified",
  },
  missing: {
    label: "Missing information",
    short: "Missing",
    className: "status-missing",
  },
  irrelevant: {
    label: "Irrelevant",
    short: "Irrelevant",
    className: "status-irrelevant",
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const hasStrings = (value, keys) =>
  keys.every((key) => typeof value[key] === "string");
const uniqueIds = (items) =>
  new Set(items.map((item) => item.id)).size === items.length;
const validReports = (reports) =>
  Array.isArray(reports) &&
  reports.every(
    (report) =>
      isObject(report) &&
      hasStrings(report, ["id", "text"]) &&
      report.id.trim() &&
      ["label", "source", "type", "time"].every(
        (key) => report[key] === undefined || typeof report[key] === "string",
      ),
  ) &&
  uniqueIds(reports);
const isExactDemo = (reports) =>
  reports.length === demoReports.length &&
  demoReports.every((demo) =>
    reports.some(
      (report) => report.id === demo.id && report.text === demo.text,
    ),
  );

export function deterministicAnalyze(reports) {
  if (!validReports(reports))
    throw new TypeError("Reports must have unique IDs and string text.");
  if (isExactDemo(reports)) return clone(demoClaims);
  return reports.flatMap((report, reportIndex) => {
    const sentences = report.text.match(/[^.!?\n]+(?:[.!?]+|$)/g) || [];
    return sentences
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .map((quote, sentenceIndex) => ({
        id: `suggestion-${reportIndex + 1}-${sentenceIndex + 1}`,
        text: quote,
        status: "unverified",
        explanation:
          "Manual review needed. This is an exact source excerpt, not a verified fact or an inferred conflict.",
        sourceIds: [report.id],
        evidence: [{ reportId: report.id, quote }],
        reviewed: false,
        note: "",
      }));
  });
}

export function applyClaimUpdate(caseData, id, patch) {
  if (!isObject(patch)) throw new TypeError("Claim update must be an object.");
  const changes = Object.fromEntries(
    ["text", "status", "reviewed", "note"]
      .filter((key) => Object.hasOwn(patch, key))
      .map((key) => [key, patch[key]]),
  );
  if (
    ["text", "note"].some(
      (key) => Object.hasOwn(changes, key) && typeof changes[key] !== "string",
    ) ||
    (Object.hasOwn(changes, "status") &&
      !Object.hasOwn(statusMeta, changes.status)) ||
    (Object.hasOwn(changes, "reviewed") &&
      typeof changes.reviewed !== "boolean")
  )
    throw new TypeError("Invalid claim update.");
  return {
    ...caseData,
    briefApproved: false,
    claims: caseData.claims.map((claim) =>
      claim.id !== id
        ? claim
        : {
            ...clone(claim),
            ...changes,
            originalText: claim.originalText ?? claim.text,
            originalStatus: claim.originalStatus ?? claim.status,
            originalEvidence: clone(claim.originalEvidence ?? claim.evidence),
            userOverride: { ...claim.userOverride, ...changes },
          },
    ),
  };
}

export function applyReports(caseData, reports) {
  const claims = deterministicAnalyze(reports);
  return { ...caseData, reports: clone(reports), claims, briefApproved: false };
}

export function isValidCase(value) {
  if (
    !isObject(value) ||
    !hasStrings(value, ["id", "title", "description", "briefNote"]) ||
    !value.id.trim() ||
    !value.title.trim() ||
    typeof value.briefApproved !== "boolean" ||
    !validReports(value.reports) ||
    !Array.isArray(value.claims) ||
    ["eyebrow", "updated"].some(
      (key) => value[key] !== undefined && typeof value[key] !== "string",
    )
  )
    return false;
  const reports = new Map(value.reports.map((report) => [report.id, report]));
  const validEvidence = (evidence, sourceIds) =>
    Array.isArray(evidence) &&
    evidence.every(
      (item) =>
        isObject(item) &&
        hasStrings(item, ["reportId", "quote"]) &&
        item.quote.trim() &&
        sourceIds.includes(item.reportId) &&
        reports.get(item.reportId)?.text.includes(item.quote),
    );
  return (
    value.claims.every(
      (claim) =>
        isObject(claim) &&
        hasStrings(claim, ["id", "text", "explanation", "note"]) &&
        claim.id.trim() &&
        Object.hasOwn(statusMeta, claim.status) &&
        typeof claim.reviewed === "boolean" &&
        Array.isArray(claim.sourceIds) &&
        claim.sourceIds.every(
          (id) => typeof id === "string" && reports.has(id),
        ) &&
        new Set(claim.sourceIds).size === claim.sourceIds.length &&
        validEvidence(claim.evidence, claim.sourceIds) &&
        (claim.originalEvidence === undefined ||
          validEvidence(claim.originalEvidence, claim.sourceIds)) &&
        (claim.originalText === undefined ||
          typeof claim.originalText === "string") &&
        (claim.originalStatus === undefined ||
          Object.hasOwn(statusMeta, claim.originalStatus)) &&
        (claim.userOverride === undefined ||
          (isObject(claim.userOverride) &&
            Object.entries(claim.userOverride).every(([key, entry]) =>
              key === "reviewed"
                ? typeof entry === "boolean"
                : key === "status"
                  ? Object.hasOwn(statusMeta, entry)
                  : ["text", "note"].includes(key) && typeof entry === "string",
            ))),
    ) && uniqueIds(value.claims)
  );
}

export function getReviewProgress(claims) {
  return claims.length
    ? Math.round(
        (claims.filter((claim) => claim.reviewed).length / claims.length) * 100,
      )
    : 0;
}
export function getClaimCounts(claims) {
  return claims.reduce((counts, claim) => {
    counts[claim.status] = (counts[claim.status] || 0) + 1;
    return counts;
  }, {});
}

export function buildBrief(caseData) {
  const activeClaims = caseData.claims.filter(
    (claim) => claim.status !== "irrelevant",
  );
  const by = (status) =>
    activeClaims.filter((claim) => claim.status === status);
  const notes = activeClaims
    .filter((claim) => claim.note?.trim())
    .map((claim) => ({ claim: claim.text, note: claim.note.trim() }));
  const method = isExactDemo(caseData.reports)
    ? "Curated fictional demo analysis. Human review is required; these are not live AI findings."
    : "Deterministic sentence extraction only. Manual review needed; no semantic verification or conflict detection is performed.";
  const recommendation = isExactDemo(caseData.reports)
    ? "Investigate the terminal battery level and connectivity logs before assuming the cause of the failure."
    : "Manually review each source excerpt and gather supporting evidence before drawing conclusions.";
  return {
    overview: caseData.description,
    confirmed: by("confirmed"),
    conflicting: by("conflicting"),
    unverified: by("unverified"),
    missing: by("missing"),
    notes,
    recommendation,
    method,
    approved: caseData.briefApproved,
    openRisk: activeClaims.filter(
      (claim) =>
        !claim.reviewed ||
        ["conflicting", "unverified", "missing"].includes(claim.status),
    ).length,
  };
}

export function briefAsMarkdown(caseData) {
  const brief = buildBrief(caseData);
  const escape = (text) =>
    text.replace(/[\\`*_{}\[\]<>#|]/g, "\\$&").replace(/\r?\n/g, " ");
  const list = (items) =>
    items.length
      ? items
          .map((item) => {
            const evidence = item.evidence
              .map((entry) => {
                const report = caseData.reports.find(
                  (source) => source.id === entry.reportId,
                );
                if (!report || !report.text.includes(entry.quote))
                  return "  - Evidence unavailable — source changed or removed; manual review needed.";
                return `  - [${escape(report.label || report.id)} · ${escape(report.id)}] ${escape(report.source || "Source")}: “${escape(entry.quote)}”`;
              })
              .join("\n");
            return `- ${escape(item.text)}\n  - ${escape(item.explanation)}${item.userOverride ? "\n  - Human override recorded; source excerpts remain unchanged." : ""}\n${evidence || "  - No source excerpt attached; manual review needed."}`;
          })
          .join("\n")
      : "- None recorded";
  const notes =
    [
      ...brief.notes.map(
        (item) => `- **${escape(item.claim)}** — ${escape(item.note)}`,
      ),
      ...(caseData.briefNote?.trim()
        ? [`- **Brief note** — ${escape(caseData.briefNote.trim())}`]
        : []),
    ].join("\n") || "- No human notes yet";
  return `# Proofline decision brief\n\n## ${escape(caseData.title)}\n\n${escape(brief.overview)}\n\n**Status:** ${brief.approved ? "Approved by human reviewer" : "Draft — human approval required"}\n\n${brief.openRisk ? `> Warning: ${brief.openRisk} unresolved or unreviewed claim(s). Approval does not resolve evidence uncertainty.` : "No unresolved active claims recorded."}\n\n## Method\n${brief.method}\n\n## Supported facts\n${list(brief.confirmed)}\n\n## Conflicting explanations\n${list(brief.conflicting)}\n\n## Unverified claims\n${list(brief.unverified)}\n\n## Missing information\n${list(brief.missing)}\n\n## Recommended next action\n${brief.recommendation}\n\n## Human review notes\n${notes}\n`;
}
