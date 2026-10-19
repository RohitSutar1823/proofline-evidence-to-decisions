import { describe, expect, it } from "vitest";
import {
  applyClaimUpdate,
  applyReports,
  buildBrief,
  briefAsMarkdown,
  deterministicAnalyze,
  getReviewProgress,
  isValidCase,
} from "./analysis.js";
import { cloneDemoCase, demoClaims, demoReports } from "./data.js";

describe("Proofline evidence workflow", () => {
  it("builds the demo brief with the unresolved cause visible", () => {
    const data = cloneDemoCase();
    const brief = buildBrief(data);

    expect(brief.confirmed).toHaveLength(2);
    expect(brief.conflicting[0].text).toContain("network failure");
    expect(brief.unverified[0].text).toContain("battery");
    expect(brief.missing[0].text).toContain("logs");
    expect(brief.recommendation).toContain(
      "battery level and connectivity logs",
    );
  });

  it("preserves source links and original excerpts for a conflicting claim", () => {
    const data = cloneDemoCase();
    const conflict = data.claims.find(
      (claim) => claim.status === "conflicting",
    );

    expect(conflict.sourceIds).toEqual(["report-a", "report-b", "report-c"]);
    expect(conflict.evidence.map((item) => item.reportId)).toEqual([
      "report-a",
      "report-b",
      "report-c",
    ]);
    expect(conflict.evidence[1].quote).toContain("Wi-Fi appeared normal");
  });

  it("updates the brief immediately when a human edits and reviews a claim", () => {
    const data = cloneDemoCase();
    const claim = data.claims.find((item) => item.id === "claim-battery-cause");
    claim.text =
      "Battery status needs verification before drawing a conclusion.";
    claim.status = "confirmed";
    claim.reviewed = true;
    claim.note =
      "Ask the venue technician to photograph the battery indicator.";

    const brief = buildBrief(data);
    expect(brief.confirmed.map((item) => item.text)).toContain(
      "Battery status needs verification before drawing a conclusion.",
    );
    expect(brief.notes[0].note).toContain("photograph");
    expect(getReviewProgress(data.claims)).toBe(20);
  });

  it("exports a truthful markdown brief with approval state", () => {
    const data = cloneDemoCase();
    const markdown = briefAsMarkdown(data);

    expect(markdown).toContain("Draft — human approval required");
    expect(markdown).toContain("Conflicting explanations");
    expect(markdown).toContain("Investigate the terminal battery level");
    expect(markdown).not.toContain("confidence score");
  });

  it("uses independently cloned curated claims only for the complete unchanged demo", () => {
    const claims = deterministicAnalyze(demoReports);
    expect(claims).toEqual(demoClaims);
    claims[0].evidence[0].quote = "Changed locally";
    expect(deterministicAnalyze(demoReports)).toEqual(demoClaims);
    expect(deterministicAnalyze([...demoReports].reverse())).toEqual(
      demoClaims,
    );
    for (const reports of [
      demoReports.slice(1),
      [...demoReports, { id: "extra", text: "Another source." }],
      demoReports.map((report, index) =>
        index ? report : { ...report, text: `${report.text} Edited.` },
      ),
      demoReports.map((report, index) =>
        index ? report : { ...report, id: "new-id" },
      ),
    ]) {
      const suggestions = deterministicAnalyze(reports);
      expect(
        suggestions.every(
          (claim) =>
            claim.status === "unverified" &&
            !claim.reviewed &&
            claim.explanation.includes("Manual review needed"),
        ),
      ).toBe(true);
      expect(
        suggestions.some((claim) => claim.id === "claim-network-cause"),
      ).toBe(false);
    }
  });

  it("extracts exact source sentences without inventing a conflict or quotation", () => {
    const reports = [
      { id: "one", text: "  The door was open.\nThe lights were off!  " },
      { id: "two", text: "The door was closed? Last fragment" },
    ];
    const claims = deterministicAnalyze(reports);
    expect(claims.map((claim) => claim.text)).toEqual([
      "The door was open.",
      "The lights were off!",
      "The door was closed?",
      "Last fragment",
    ]);
    expect(claims.every((claim) => claim.status === "unverified")).toBe(true);
    for (const claim of claims) {
      expect(claim.evidence).toHaveLength(1);
      expect(claim.sourceIds).toEqual([claim.evidence[0].reportId]);
      expect(
        reports.find((report) => report.id === claim.sourceIds[0]).text,
      ).toContain(claim.evidence[0].quote);
      expect(claim.text).toBe(claim.evidence[0].quote);
    }
    expect(deterministicAnalyze([{ id: "empty", text: " \n " }])).toEqual([]);
    expect(() =>
      deterministicAnalyze([
        { id: "same", text: "One." },
        { id: "same", text: "Two." },
      ]),
    ).toThrow();
  });

  it("invalidates approval on claim edits and preserves the original evidence and override history", () => {
    const data = { ...cloneDemoCase(), briefApproved: true };
    const original = data.claims[0];
    const edited = applyClaimUpdate(data, original.id, {
      text: "A human conclusion.",
      status: "unverified",
      reviewed: true,
      evidence: [{ reportId: "fake", quote: "Fabricated" }],
      sourceIds: ["fake"],
    });
    expect(edited.briefApproved).toBe(false);
    expect(data.briefApproved).toBe(true);
    expect(data.claims[0]).toEqual(original);
    expect(edited.claims[0].evidence).toEqual(original.evidence);
    expect(edited.claims[0].sourceIds).toEqual(original.sourceIds);
    expect(edited.claims[0].originalEvidence).toEqual(original.evidence);
    const again = applyClaimUpdate(edited, original.id, {
      note: "Check this with the organizer.",
    });
    expect(again.claims[0].originalText).toBe(original.text);
    expect(again.claims[0].originalStatus).toBe(original.status);
    expect(again.claims[0].userOverride).toEqual({
      text: "A human conclusion.",
      status: "unverified",
      reviewed: true,
      note: "Check this with the organizer.",
    });
    edited.claims[0].evidence[0].quote = "Mutated result";
    expect(again.claims[0].originalEvidence).toEqual(original.evidence);
    expect(data.claims[0].evidence[0].quote).not.toBe("Mutated result");
    expect(isValidCase(again)).toBe(true);
    expect(() =>
      applyClaimUpdate(data, original.id, { status: "invented" }),
    ).toThrow();
  });

  it("rebuilds claims after source edits or removal without retaining stale evidence or review decisions", () => {
    const data = applyClaimUpdate(cloneDemoCase(), "claim-battery-cause", {
      reviewed: true,
      note: "Old review",
    });
    data.briefApproved = true;
    const reports = data.reports
      .filter((report) => report.id !== "report-b")
      .map((report) =>
        report.id === "report-a"
          ? { ...report, text: "The terminal is now working." }
          : report,
      );
    const updated = applyReports(data, reports);
    expect(updated.briefApproved).toBe(false);
    expect(
      updated.claims.every(
        (claim) => !claim.reviewed && !claim.note && !claim.userOverride,
      ),
    ).toBe(true);
    expect(updated.claims.flatMap((claim) => claim.sourceIds)).not.toContain(
      "report-b",
    );
    expect(JSON.stringify(updated.claims)).not.toContain("battery");
    expect(isValidCase(updated)).toBe(true);
    reports[0].text = "External mutation";
    expect(updated.reports[0].text).toBe("The terminal is now working.");
    expect(applyReports(data, []).claims).toEqual([]);
    expect(
      data.claims.some((claim) => claim.id === "claim-battery-cause"),
    ).toBe(true);
  });

  it("rejects malformed persisted nested data and stale or fabricated evidence", () => {
    expect(isValidCase(cloneDemoCase())).toBe(true);
    expect(
      isValidCase(
        JSON.parse(
          JSON.stringify(
            applyClaimUpdate(cloneDemoCase(), "claim-network-cause", {
              note: "Human annotation",
            }),
          ),
        ),
      ),
    ).toBe(true);
    for (const invalid of [
      null,
      [],
      {},
      { ...cloneDemoCase(), reports: {} },
      { ...cloneDemoCase(), claims: [null] },
    ])
      expect(isValidCase(invalid)).toBe(false);
    const mutations = [
      (data) => {
        data.claims[0].evidence = [null];
      },
      (data) => {
        data.claims[0].evidence[0].quote = "Invented quotation";
      },
      (data) => {
        data.claims[0].sourceIds = ["absent"];
      },
      (data) => {
        data.claims[0].reviewed = "yes";
      },
      (data) => {
        data.claims[0].status = "toString";
      },
      (data) => {
        data.claims[0].note = {};
      },
      (data) => {
        data.reports[0].text = null;
      },
      (data) => {
        data.reports.push(data.reports[0]);
      },
      (data) => {
        data.claims.push(data.claims[0]);
      },
      (data) => {
        data.claims[0].userOverride = { status: "fabricated" };
      },
      (data) => {
        data.claims[0].originalEvidence = [
          { reportId: "report-a", quote: "Invented" },
        ];
      },
    ];
    for (const mutate of mutations) {
      const data = cloneDemoCase();
      mutate(data);
      expect(isValidCase(data)).toBe(false);
    }
  });

  it("exports citations, excerpts, uncertainty, method and human notes while excluding irrelevant claims", () => {
    let data = applyClaimUpdate(cloneDemoCase(), "claim-cash-fallback", {
      status: "irrelevant",
      note: "Excluded note",
    });
    data = applyClaimUpdate(data, "claim-network-cause", {
      note: "Check the terminal logs.",
    });
    data.briefNote = "Owner will gather evidence.";
    data.briefApproved = true;
    const markdown = briefAsMarkdown(data);
    expect(markdown).toContain(
      "[Report A · report-a] Event organizer: “The terminal displayed a network error.”",
    );
    expect(markdown).toContain(
      "[Report B · report-b] Student volunteer: “The Wi-Fi appeared normal on nearby phones.”",
    );
    expect(markdown).toContain("Warning:");
    expect(markdown).toContain(
      "Approval does not resolve evidence uncertainty",
    );
    expect(markdown).toContain("## Method");
    expect(markdown).toContain("Curated fictional demo");
    expect(markdown).toContain("Check the terminal logs.");
    expect(markdown).toContain("Owner will gather evidence.");
    expect(markdown).not.toContain("Cash registration remained available");
    expect(markdown).not.toContain("Excluded note");
    const custom = applyReports(data, [
      { id: "custom", text: "A new observation." },
    ]);
    expect(briefAsMarkdown(custom)).toContain(
      "Deterministic sentence extraction only",
    );
    expect(briefAsMarkdown(custom)).not.toContain(
      "Investigate the terminal battery level",
    );
    data.reports = [];
    expect(briefAsMarkdown(data)).not.toContain(
      "“The terminal displayed a network error.”",
    );
    expect(briefAsMarkdown(data)).toContain("source changed or removed");
  });
});
