import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  applyClaimUpdate,
  applyReports,
  isValidCase,
  buildBrief,
  briefAsMarkdown,
  getClaimCounts,
  getReviewProgress,
  statusMeta,
} from "./analysis.js";
import { cloneDemoCase } from "./data.js";
import "./styles.css";

const iconPaths = {
  mark: (
    <>
      <path d="M5 4.5h8.5a2 2 0 0 1 2 2V14" />
      <path d="M11 19.5H5.5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2H7" />
      <path d="m8 12 2.1 2.1L17.5 6.7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h13M13 7l5 5-5 5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  spark: (
    <>
      <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
      <path d="M19 16v5M16.5 18.5h5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.5h7l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M13 3.5V8h4M8 12h5M8 15.5h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10M8 10l4 4 4-4M5 19h14" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="10" height="11" rx="1.5" />
      <path d="M16 8V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  refresh: (
    <>
      <path d="M19 8a7.5 7.5 0 1 0 1 7" />
      <path d="M19 4v4h-4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14M10 11v5M14 11v5M7 7l1 13h8l1-13M9 7V4h6v3" />
    </>
  ),
  edit: (
    <>
      <path d="m5 16-.8 3.8L8 19l10.5-10.5a1.8 1.8 0 0 0-2.5-2.5L5 16Z" />
      <path d="m14.5 7.5 2.5 2.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

function App() {
  const [caseData, setCaseData] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("proofline-case"));
      return isValidCase(stored) ? stored : cloneDemoCase();
    } catch {
      return cloneDemoCase();
    }
  });
  const [selectedId, setSelectedId] = useState("claim-network-cause");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("workspace");
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("proofline-case", JSON.stringify(caseData));
    } catch {
      setToast(
        "Browser storage is unavailable. Export your brief before leaving.",
      );
    }
  }, [caseData]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const brief = useMemo(() => buildBrief(caseData), [caseData]);
  const counts = useMemo(
    () => getClaimCounts(caseData.claims),
    [caseData.claims],
  );
  const selectedClaim =
    caseData.claims.find((claim) => claim.id === selectedId) ||
    caseData.claims[0];
  const filteredClaims = caseData.claims.filter((claim) => {
    const evidenceText = claim.evidence.map((item) => item.quote).join(" ");
    const sourceText = claim.sourceIds
      .map(
        (id) =>
          caseData.reports.find((report) => report.id === id)?.source || "",
      )
      .join(" ");
    const matchesQuery =
      `${claim.text} ${claim.explanation} ${evidenceText} ${sourceText}`
        .toLowerCase()
        .includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || claim.status === filter);
  });

  function updateClaim(id, patch) {
    setCaseData((current) => applyClaimUpdate(current, id, patch));
  }
  function resetCase() {
    if (
      !window.confirm("Restore fictional demo data and clear current changes?")
    )
      return;
    setCaseData(cloneDemoCase());
    setSelectedId("claim-network-cause");
    setQuery("");
    setFilter("all");
    setView("workspace");
    setToast("Demo case restored to its original evidence.");
  }
  function approveBrief() {
    if (
      brief.openRisk > 0 &&
      !window.confirm(
        `This brief has ${brief.openRisk} unresolved or unreviewed claims. Approve with these risks explicitly retained?`,
      )
    )
      return;
    if (brief.openRisk > 0)
      setToast(
        "Approval saved with open evidence risks. The brief remains transparent about them.",
      );
    else setToast("Decision brief approved.");
    setCaseData((current) => ({ ...current, briefApproved: true }));
  }
  async function copyBrief() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(briefAsMarkdown(caseData));
      setToast("Markdown brief copied to clipboard.");
    } catch {
      setToast("Copy was blocked by the browser. Use Download .md instead.");
    }
  }
  function downloadBrief() {
    const blob = new Blob([briefAsMarkdown(caseData)], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "proofline-decision-brief.md";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Decision brief downloaded.");
  }
  function saveReport(report) {
    setCaseData((current) => {
      const exists = current.reports.some((item) => item.id === report.id);
      return applyReports(
        current,
        exists
          ? current.reports.map((item) =>
              item.id === report.id ? report : item,
            )
          : [...current.reports, report],
      );
    });
    setShowReportForm(false);
    setEditingReport(null);
    setToast("Source saved. Evidence regenerated for human review.");
  }
  function removeReport(id) {
    if (
      !window.confirm(
        "Remove this source? Claims will be regenerated and prior reviews cleared to prevent stale evidence.",
      )
    )
      return;
    setCaseData((current) =>
      applyReports(
        current,
        current.reports.filter((report) => report.id !== id),
      ),
    );
    setToast("Source removed. Remaining evidence regenerated for review.");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="mark" size={23} />
          </span>
          <span>proofline</span>
          <span className="brand-divider" />
          <span className="brand-sub">evidence to decisions</span>
        </div>
        <div className="topbar-actions">
          <span className="local-pill">
            <span className="dot" /> Local workspace
          </span>
          <button className="text-button" onClick={resetCase}>
            <Icon name="refresh" size={15} /> Reset case
          </button>
          <span className="avatar">AR</span>
        </div>
      </header>
      <main className="page">
        <section className="hero">
          <div>
            <div className="kicker">
              <span className="kicker-line" /> HUMAN-IN-THE-LOOP ANALYSIS
            </div>
            <h1>
              Find the signal
              <br />
              <em>before you act.</em>
            </h1>
            <p className="hero-copy">
              Proofline turns messy, conflicting reports into an evidence-linked
              decision brief — with a human in charge of every conclusion.
            </p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={resetCase}>
              <Icon name="spark" size={17} /> Load demo case{" "}
              <Icon name="arrow" size={16} />
            </button>
            <p>
              <span className="tiny-lock">◇</span> Offline · No runtime AI ·
              Human-reviewed evidence
            </p>
          </div>
        </section>

        <section className="case-banner">
          <div className="case-heading">
            <span className="case-icon">
              <Icon name="file" size={18} />
            </span>
            <div>
              <div className="eyebrow">{caseData.eyebrow}</div>
              <h2>{caseData.title}</h2>
              <p>{caseData.description}</p>
            </div>
          </div>
          <div className="case-stats">
            <Stat label="Sources" value={caseData.reports.length} />
            <Stat label="Claims" value={caseData.claims.length} />
            <Stat
              label="Reviewed"
              value={`${getReviewProgress(caseData.claims)}%`}
            />
            <div className="case-updated">
              Updated
              <br />
              <strong>{caseData.updated}</strong>
            </div>
          </div>
        </section>

        <div className="workspace-tabs">
          <button
            aria-pressed={view === "workspace"}
            className={view === "workspace" ? "tab active" : "tab"}
            onClick={() => setView("workspace")}
          >
            Evidence workspace <span>{caseData.claims.length}</span>
          </button>
          <button
            aria-pressed={view === "brief"}
            className={view === "brief" ? "tab active" : "tab"}
            onClick={() => setView("brief")}
          >
            Decision brief{" "}
            {caseData.briefApproved && (
              <span className="approved-dot" aria-label="Approved">
                <Icon name="check" size={11} />
              </span>
            )}
          </button>
          <div className="tab-rule" />
          <span className="analysis-label">
            <span className="violet-dot" /> Offline analysis ·{" "}
            <strong>not generative AI</strong>
          </span>
        </div>

        {view === "workspace" ? (
          <section className="workspace-grid">
            <aside className="sources-panel panel">
              <PanelHeader
                title="Source reports"
                meta={`${caseData.reports.length} source reports`}
                action={
                  <button
                    className="icon-button"
                    onClick={() => {
                      setEditingReport(null);
                      setShowReportForm(true);
                    }}
                    aria-label="Add source report"
                  >
                    <Icon name="plus" size={17} />
                  </button>
                }
              />
              <div className="fictional-note">
                <Icon name="info" size={14} /> Reports A–C start as fiction. Added reports are user-provided; all stay on this device.
              </div>
              <div className="source-list">
                {caseData.reports.map((report) => (
                  <SourceCard
                    key={report.id}
                    report={report}
                    onEdit={() => {
                      setEditingReport(report);
                      setShowReportForm(true);
                    }}
                    onRemove={() => removeReport(report.id)}
                  />
                ))}
              </div>
              <button
                className="add-source"
                onClick={() => {
                  setEditingReport(null);
                  setShowReportForm(true);
                }}
              >
                <Icon name="plus" size={15} /> Add source report
              </button>
            </aside>
            <section className="evidence-panel">
              <div className="evidence-head">
                <div>
                  <div className="eyebrow">EVIDENCE MAP</div>
                  <h2>What the reports support</h2>
                  <p>
                    System suggestions stay visible as suggestions. You decide what
                    earns a place in the brief.
                  </p>
                </div>
                <div className="review-progress">
                  <div className="progress-label">
                    <span>Review progress</span>
                    <strong>{getReviewProgress(caseData.claims)}%</strong>
                  </div>
                  <div className="progress-track" role="progressbar" aria-label="Claim review progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={getReviewProgress(caseData.claims)}>
                    <span
                      style={{
                        width: `${getReviewProgress(caseData.claims)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="map-toolbar">
                <div className="search-box">
                  <Icon name="search" size={16} />
                  <input
                    aria-label="Search claims"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search claims or evidence..."
                  />
                </div>
                <div className="filter-buttons">
                  <FilterButton
                    label="All"
                    active={filter === "all"}
                    count={caseData.claims.length}
                    onClick={() => setFilter("all")}
                  />
                  {["confirmed", "conflicting", "unverified", "missing"].map(
                    (status) => (
                      <FilterButton
                        key={status}
                        label={statusMeta[status].short}
                        active={filter === status}
                        count={counts[status] || 0}
                        onClick={() => setFilter(status)}
                      />
                    ),
                  )}
                </div>
              </div>
              <div className="claims-list">
                {filteredClaims.length ? (
                  filteredClaims.map((claim) => (
                    <ClaimCard
                      key={claim.id}
                      claim={claim}
                      selected={claim.id === selectedId}
                      onClick={() => setSelectedId(claim.id)}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <Icon name="search" size={22} />
                    <strong>No claims found</strong>
                    <span>Try a different search or filter.</span>
                  </div>
                )}
              </div>
            </section>
            <aside className="review-panel panel">
              <ReviewPanel
                claim={selectedClaim}
                reports={caseData.reports}
                onUpdate={updateClaim}
              />
            </aside>
          </section>
        ) : (
          <BriefView
            caseData={caseData}
            brief={brief}
            onApprove={approveBrief}
            onCopy={copyBrief}
            onDownload={downloadBrief}
            onGoBack={() => setView("workspace")}
          />
        )}
      </main>
      {showReportForm && (
        <ReportModal
          initial={editingReport}
          onClose={() => {
            setShowReportForm(false);
            setEditingReport(null);
          }}
          onSave={saveReport}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Icon name="check" size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function existsById(items, id) {
  return items.some((item) => item.id === id);
}
function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function PanelHeader({ title, meta, action }) {
  return (
    <div className="panel-header">
      <div>
        <h3>{title}</h3>
        <span>{meta}</span>
      </div>
      {action}
    </div>
  );
}
function FilterButton({ label, count, active, onClick }) {
  return (
    <button
      className={`filter-button ${active ? "active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
      <span>{count}</span>
    </button>
  );
}

function SourceCard({ report, onEdit, onRemove }) {
  return (
    <article className="source-card">
      <div className="source-card-top">
        <span className="source-label">{report.label}</span>
        <div className="source-actions">
          <button onClick={onEdit} aria-label={`Edit ${report.label}`}>
            <Icon name="edit" size={14} />
          </button>
          <button onClick={onRemove} aria-label={`Remove ${report.label}`}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
      <h4>{report.source}</h4>
      <p>{report.text}</p>
      <div className="source-meta">
        <span>{report.type}</span>
        <span>{report.time}</span>
      </div>
    </article>
  );
}

function ClaimCard({ claim, selected, onClick }) {
  const meta = statusMeta[claim.status] || statusMeta.unverified;
  return (
    <button
      className={`claim-card ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="claim-card-head">
        <span className={`status-badge ${meta.className}`}>
          <span className="status-symbol">
            {claim.status === "confirmed"
              ? "✓"
              : claim.status === "conflicting"
                ? "↕"
                : claim.status === "missing"
                  ? "!"
                  : "?"}
          </span>
          {meta.label}
        </span>
        {claim.reviewed ? (
          <span className="reviewed">
            <Icon name="check" size={12} /> Human reviewed
          </span>
        ) : (
          <span className="suggested">
            <Icon name="spark" size={12} /> Suggestion
          </span>
        )}
      </div>
      <h3>{claim.text}</h3>
      <p>{claim.explanation}</p>
      <div className="claim-card-foot">
        <span className="source-links">
          {claim.sourceIds.length ? (
            <>
              <Icon name="file" size={13} /> {claim.sourceIds.length} source
              {claim.sourceIds.length > 1 ? "s" : ""}
            </>
          ) : (
            <>
              <Icon name="info" size={13} /> Evidence needed
            </>
          )}
        </span>
        <Icon name="chevron" size={16} />
      </div>
    </button>
  );
}

function ReviewPanel({ claim, reports, onUpdate }) {
  if (!claim)
    return (
      <div className="review-empty">
        <Icon name="file" size={25} />
        <h3>Select a claim</h3>
        <p>
          Choose a claim from the Evidence Map to inspect its original evidence.
        </p>
      </div>
    );
  const meta = statusMeta[claim.status] || statusMeta.unverified;
  return (
    <div className="review-inner">
      <div className="review-kicker">
        <span className="eyebrow">CLAIM REVIEW</span>
        <span className={`status-badge ${meta.className}`}>{meta.label}</span>
      </div>
      <h2>{claim.text}</h2>
      <div className="suggestion-callout">
        <Icon name="spark" size={16} />
        <div>
          <strong>System suggestion</strong>
          <p>{claim.explanation}</p>
          {claim.originalText && claim.originalText !== claim.text && <p>Original claim: {claim.originalText}</p>}
        </div>
      </div>
      <div className="review-section">
        <div className="section-label">
          <span>Original evidence</span>
          <span>
            {claim.evidence.length} excerpt
            {claim.evidence.length !== 1 ? "s" : ""}
          </span>
        </div>
        {claim.evidence.length ? (
          <div className="evidence-excerpts">
            {claim.evidence.map((item) => {
              const report = reports.find((r) => r.id === item.reportId);
              return (
                <div className="excerpt" key={`${item.reportId}-${item.quote}`}>
                  <div className="excerpt-source">
                    <span>{report?.label || "Source"}</span>
                    <strong>{report?.source}</strong>
                  </div>
                  <blockquote>“{item.quote}”</blockquote>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="missing-evidence">
            No source excerpt attached. This is a missing-information prompt,
            not a confirmed fact.
          </div>
        )}
      </div>
      <div className="review-section">
        <div className="section-label">
          <span>Human decision</span>
          <span className="human-label">
            <span className="human-dot" /> Required
          </span>
        </div>
        <div className="decision-grid">
          {["confirmed", "unverified", "irrelevant"].map((status) => (
            <button
              key={status}
              className={
                claim.reviewed && claim.status === status
                  ? "decision active"
                  : "decision"
              }
              onClick={() => onUpdate(claim.id, { status, reviewed: true })}
            >
              <span className={`decision-icon ${statusMeta[status].className}`}>
                {status === "confirmed"
                  ? "✓"
                  : status === "unverified"
                    ? "?"
                    : "—"}
              </span>
              <span>{statusMeta[status].label}</span>
            </button>
          ))}
        </div>
        <label className="edit-label">Evidence classification
          <select value={claim.status} onChange={(event) => onUpdate(claim.id, { status: event.target.value, reviewed: false })}>
            {Object.entries(statusMeta).map(([status, item]) => <option key={status} value={status}>{item.label}</option>)}
          </select>
        </label>
        <button className="secondary-button approve-claim" onClick={() => onUpdate(claim.id, { reviewed: true })} disabled={!claim.text.trim()}><Icon name="check" size={15}/> Approve claim review</button>
        <label className="edit-label">
          Edit claim
          <input
            value={claim.text}
            onChange={(event) =>
              onUpdate(claim.id, { text: event.target.value, reviewed: false })
            }
          />
        </label>
        <label className="edit-label">
          Review note
          <textarea
            value={claim.note || ""}
            onChange={(event) =>
              onUpdate(claim.id, { note: event.target.value, reviewed: false })
            }
            placeholder="What should the next reviewer know?"
            rows="3"
          />
        </label>
      </div>
      <div className="review-footer">
        <span>
          <Icon name="info" size={14} /> Your review changes the brief
          immediately.
        </span>
        <span>{claim.reviewed ? "Saved locally" : "Awaiting review"}</span>
      </div>
    </div>
  );
}

function BriefView({
  caseData,
  brief,
  onApprove,
  onCopy,
  onDownload,
  onGoBack,
}) {
  const Section = ({ title, items, tone }) => (
    <section className={`brief-section ${tone || ""}`}>
      <div className="brief-section-title">
        <span>{title}</span>
        <span>{items.length}</span>
      </div>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <span className="bullet" />
              <div>
                  <strong>{item.text}</strong>
                  <small>{item.explanation}</small>
                  <small>{item.reviewed ? 'Human reviewed' : 'Unreviewed suggestion'} · {item.sourceIds.map((id) => caseData.reports.find((report) => report.id === id)?.label).filter(Boolean).join(', ') || 'No source attached'}</small>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="brief-empty">Nothing recorded yet.</div>
      )}
    </section>
  );
  return (
    <section className="brief-page">
      <div className="brief-toolbar">
        <button className="back-button" onClick={onGoBack}>
          <Icon name="arrow" size={16} /> Back to evidence map
        </button>
        <div className="brief-actions">
          <button className="secondary-button" onClick={onCopy}>
            <Icon name="copy" size={15} /> Copy Markdown
          </button>
          <button className="secondary-button" onClick={onDownload}>
            <Icon name="download" size={15} /> Download .md
          </button>
        </div>
      </div>
      <div className="brief-paper">
        <div className="brief-top">
          <div>
            <div className="kicker">
              <span className="kicker-line" /> DECISION BRIEF · PROOFLINE
            </div>
            <h1>{caseData.title}</h1>
              <p>{brief.overview}</p>
              <p className="method-note">{brief.method}</p>
          </div>
          <div className={`approval-stamp ${brief.approved ? "approved" : ""}`}>
            <span>{brief.approved ? "✓" : "DRAFT"}</span>
            <strong>
              {brief.approved ? "Human approved" : "Review required"}
            </strong>
          </div>
        </div>
        <div className="brief-warning">
          <Icon name="info" size={17} />
          <span>
            <strong>
              {brief.openRisk} open evidence risk
              {brief.openRisk === 1 ? "" : "s"}.
            </strong>{" "}
            {brief.openRisk
              ? "Review the highlighted uncertainty before treating the recommendation as settled."
              : "All active claims have been reviewed."}
          </span>
        </div>
        <div className="brief-grid">
          <Section
            title="Supported facts"
            items={brief.confirmed}
            tone="confirmed-section"
          />
          <Section
            title="Conflicting explanations"
            items={brief.conflicting}
            tone="conflicting-section"
          />
          <Section
            title="Unverified claims"
            items={brief.unverified}
            tone="unverified-section"
          />
          <Section
            title="Missing information"
            items={brief.missing}
            tone="missing-section"
          />
        </div>
        <section className="recommendation">
          <div>
            <div className="brief-section-title">
              <span>Recommended next action</span>
              <span className="violet-pill">
                <Icon name="spark" size={12} /> System suggestion
              </span>
            </div>
            <h2>{brief.recommendation}</h2>
            <p>
              Proofline recommends an action that gathers evidence without
              assuming the cause. A human reviewer must approve it.
            </p>
          </div>
          <Icon name="arrow" size={25} />
        </section>
        <section className="notes-section">
          <div className="brief-section-title">
            <span>Human review notes</span>
            <span>{brief.notes.length}</span>
          </div>
          {brief.notes.length ? (
            brief.notes.map((item) => (
              <div className="human-note" key={item.claim}>
                <Icon name="edit" size={14} />
                <span>
                  <strong>{item.claim}</strong>
                  {item.note}
                </span>
              </div>
            ))
          ) : (
            <div className="brief-empty">
              Notes added during claim review will appear here.
            </div>
          )}
        </section>
        <div className="brief-approval">
          <div>
            <strong>Ready to approve this brief?</strong>
            <span>
              Approval records your judgment, not an automated verdict.
            </span>
          </div>
          <button className="primary-button" onClick={onApprove}>
            <Icon name="check" size={16} />{" "}
            {brief.approved
              ? "Approved by human reviewer"
              : "Approve decision brief"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ReportModal({ initial, onClose, onSave }) {
  const dialogRef = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector('input')?.focus();
    return () => previous?.focus();
  }, []);
  const dialogKeys = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button, input, textarea, select')].filter((element) => !element.disabled);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const [report, setReport] = useState(
    initial || {
      id: `report-${Date.now()}`,
      label: "New report",
      source: "",
      type: "Human report",
      time: "Now",
      text: "",
    },
  );
  const update = (key, value) =>
    setReport((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (![report.source, report.text, report.label, report.type].every((value) => value.trim())) { setError('Source name, label, type, and report text cannot be blank.'); return; }
    onSave(report);
  };
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        ref={dialogRef}
        onKeyDown={dialogKeys}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">SOURCE REPORT</div>
            <h2 id="report-dialog-title">
              {initial ? "Edit report" : "Add a source report"}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <p className="form-notice">Saving regenerates claim suggestions and clears previous reviews, so changed sources never retain stale evidence. No data leaves this device.</p>
          {error && <p role="alert" className="form-error">{error}</p>}
          <label>
            Source name
            <input
              value={report.source}
              onChange={(e) => update("source", e.target.value)}
              placeholder="e.g. Event organizer"
              required
            />
          </label>
          <div className="form-row">
            <label>
              Label
              <input
                value={report.label}
                onChange={(e) => update("label", e.target.value)}
                required
              />
            </label>
            <label>
              Type
              <input
                value={report.type}
                onChange={(e) => update("type", e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            Report text
            <textarea
              value={report.text}
              onChange={(e) => update("text", e.target.value)}
              rows="5"
              placeholder="Paste the original wording here..."
              required
            />
          </label>
          <label>
            Time noted
            <input
              value={report.time}
              onChange={(e) => update("time", e.target.value)}
              placeholder="e.g. 11:05 AM"
            />
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Save report <Icon name="arrow" size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
