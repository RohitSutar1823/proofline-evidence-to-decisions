# Proofline — Final Buildathon Handoff

**Track:** Human × AI  
**Live application:** https://proofline-evidence-to-decisions.vercel.app/  
**Public repository:** https://github.com/RohitSutar1823/proofline-evidence-to-decisions  
**Buildathon console:** https://omnirush.ai/console/buildathon  
**Unstop event:** https://unstop.com/p/omnirush-agentic-buildathon-2026-omnirush-1769914  

## Executive summary

Proofline helps people make decisions when several reports contain overlapping facts, contradictions, assumptions, or missing information. It turns reports into an evidence-linked workspace rather than a confident-looking summary.

The central idea is simple: every claim remains connected to original wording, while the human reviewer decides what is confirmed, conflicting, unverified, missing, or irrelevant.

## What the product does

The current workflow is:

1. Open the fictional Campus Innovation Fair payment-failure case.
2. Inspect three source reports from an event organizer, student volunteer, and venue technician.
3. Review the Evidence Map, which contains five prepared claims.
4. Select the conflicting network-cause claim to inspect all three original excerpts.
5. Edit a claim, choose a classification, or add a review note.
6. Explicitly approve the claim review.
7. Open the decision brief.
8. Review supported facts, conflicting explanations, unverified claims, missing information, open-risk warnings, the recommended next action, and human notes.
9. Explicitly approve the brief, with a confirmation prompt when unresolved risks remain.
10. Copy or download the brief as Markdown.

Source reports can also be added, edited, and removed. Any source change regenerates conservative claims and invalidates previous review/approval state so stale citations are not retained.

## Why it fits Human × AI

Proofline demonstrates a collaboration pattern in which a system organizes evidence and a human remains accountable for conclusions.

The product makes uncertainty visible instead of hiding disagreement inside a polished answer. A reviewer can inspect original excerpts, change a claim, add context, classify it, approve it, and see the decision brief update immediately.

Human-controlled decisions include:

- Whether a claim is confirmed, unverified, irrelevant, conflicting, or missing.
- How a claim is worded.
- Which review note is attached.
- Whether a claim review is approved.
- Whether the final decision brief is approved.
- Whether an unresolved recommendation is safe to act on.

## Analysis disclosure

The current application does **not** perform live generative-AI inference and does **not** implement general-purpose semantic contradiction detection.

- For the exact unchanged fictional demo dataset, Proofline returns curated claims and source excerpts prepared in `src/data.js`.
- For edited or new reports, Proofline performs deterministic sentence extraction. Each extracted sentence is an unverified suggestion with an exact source quotation.
- Source edits do not silently preserve old semantic conclusions.
- The decision brief labels its method and keeps unresolved risks visible.

This is intentional: the demo remains reproducible without API keys, network access, or unsupported claims about AI capability.

## What OmniRush contributed in this recorded project session

Based on the available workspace and session history, OmniRush was used to:

- Explore and evaluate multiple Human × AI product opportunities.
- Select and scope Proofline for a one-day implementation.
- Create the React/Vite application shell and evidence-investigation UI.
- Implement the fictional demo data and curated claim map.
- Implement deterministic analysis, source linking, review state, approval invalidation, and Markdown export.
- Add source report CRUD and browser-local persistence validation.
- Add automated logic and React/jsdom workflow tests.
- Review the implementation for trust, accessibility, and reproducibility issues.
- Fix stale-evidence behavior, approval invalidation, clipboard feedback, offline font loading, pinned dependency compatibility, and slow whole-page test queries.
- Add Docker, runtime pinning, environment-template, README, and verification documentation.
- Inspect the official buildathon guide.
- Push the repository to the public GitHub URL listed above.

No external generative-AI tool was used for this project work in the recorded session.

## Engineering verification

The latest recorded verification includes:

```text
Node: v24.13.0
Tests: 2 test files, 22 tests passed
Production build: passed
git diff --check: passed
Dev-server HEAD request: HTTP 200
```

Pinned-runtime commands used:

```bash
npm exec --offline --package=node@24.13.0 -- node node_modules/vitest/vitest.mjs run --reporter=dot
npm exec --offline --package=node@24.13.0 -- node node_modules/vite/bin/vite.js build
git diff --check
```

The report CRUD test previously exceeded the default Vitest timeout because it repeatedly queried the entire rendered page. The test was changed to scope queries to the relevant panels and use unique claim headings. The blanket timeout increase was removed. Two consecutive full-suite runs passed with the default timeout.

The latest committed verification documentation is in `VERIFICATION.md`.

## Git state

The latest inspected working tree was clean before this handoff document was created. The latest project commit before this document was:

```text
d7828d0 docs: record official buildathon submission requirements
```

The repository remote is configured as:

```text
https://github.com/RohitSutar1823/proofline-evidence-to-decisions.git
```

This handoff document is committed locally as a documentation-only milestone. No push or buildathon submission is performed by this handoff.

## Two-minute judge demonstration

### 0:00–0:20 — Set up the problem

Open the live app and say:

> “Proofline helps a human make a decision from multiple reports without hiding contradictions or treating assumptions as facts.”

Reset or load the fictional Campus Innovation Fair case.

### 0:20–0:55 — Show the evidence map

Select **A network failure caused the payment terminal outage**.

Show the three original excerpts:

- The terminal displayed a network error.
- Nearby Wi-Fi appeared normal.
- The later venue network restart was described as unrelated.

Say:

> “Proofline does not silently choose a cause. It keeps the explanations visible as conflicting evidence and lets the reviewer inspect the original wording.”

### 0:55–1:20 — Demonstrate human review

Select the battery claim. Edit its wording or add a review note such as:

> “Check the terminal battery and connectivity logs before choosing a cause.”

Choose **Unverified**, then click **Approve claim review**. Point out that editing the note or classification requires review again.

### 1:20–1:45 — Show the decision brief

Open **Decision brief**. Show:

- Supported facts
- Conflicting explanations
- Unverified claims
- Missing information
- The unresolved-risk warning
- The recommended next action: investigate battery and connectivity logs before assuming the cause

### 1:45–2:00 — Approve and export

Click **Approve decision brief**. Confirm the deliberate warning when unresolved risks remain. Then use **Download .md** or **Copy Markdown**.

Do not claim the download was tested in a real browser unless it has been inspected on the machine used for recording.

## Official submission checklist

The authoritative source inspected for this checklist is:

https://omnirush.ai/buildathon

The guide states:

- Deadline: **20 October 2026 at 11:59 PM IST**.
- Submit through the OmniRush buildathon dashboard.
- Select the **Human × AI** track.
- Add a public GitHub repository owned by the connected GitHub account.
- Add the OmniRush sessions used to build the project.
- Demo video and live link are optional; a 2–3 minute demo video is recommended.
- OmniRush must be the only generative AI tool used for code, text, or images.
- Participation is solo.
- Judges rebuild projects with Docker and run tests offline.
- README, lockfile, pinned runtime, Dockerfile, one offline test command, `.env.example`, and portable paths are expected.
- After dashboard submission, copy the Submission ID into the Unstop event.

## Confirmed for this project

- Public repository URL exists.
- Live application URL is available.
- README exists.
- `package-lock.json` exists.
- `.nvmrc` pins Node 24.13.0.
- Dockerfile exists.
- `npm test` is the documented test command.
- `.env.example` contains no credentials.
- Source code contains no machine-specific absolute paths.
- The app explicitly discloses that it has no runtime AI.
- The repository was built and modified through recorded OmniRush project work in this session.

## Still requiring verification before submission

- Docker build and network-disabled container test: Docker was unavailable in this environment.
- Real-browser desktop and mobile walkthrough: the live browser tab was observable, but browser click dispatch repeatedly returned stale-observation errors.
- Real downloaded Markdown file inspection: not verified.
- OmniRush dashboard join state, selected track, session list, recording receipt, and Submission ID: not inspected.
- Official submission form state and server-side deadline: verify immediately before submitting.
- Demo recording: not created in this session.

## Exact next steps for the owner

1. Run the Docker commands from `README.md` on a Docker-capable machine.
2. Open the live URL in a normal browser and manually run the demo script above at desktop and mobile widths.
3. Download the Markdown brief and open the actual downloaded file.
4. Record a 2–3 minute screen demo with your own narration if desired.
5. Open `https://omnirush.ai/console/buildathon`.
6. Select Human × AI and add the public GitHub repository.
7. Add the OmniRush sessions used to create Proofline.
8. Add the live URL and optional demo video.
9. Submit in the OmniRush dashboard and copy the Submission ID.
10. Paste the Submission ID into the Unstop event page.

Do not claim that OmniRush has marked this session “Good.” No dashboard confirmation of that status is available in the project workspace.
