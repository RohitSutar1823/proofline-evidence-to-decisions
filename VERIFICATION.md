# Proofline verification — October 19, 2026

## Passed

- `npm test` — 2 test files, 22 tests, including React/jsdom interactions.
- `npm run build` — production assets emitted successfully.
- `npm exec --yes --package=node@24.13.0 -- node --version` — `v24.13.0`.
- `npm exec --offline --package=node@24.13.0 -- node node_modules/vitest/vitest.mjs run` — all 22 tests passed under the pinned runtime.
- `npm exec --offline --package=node@24.13.0 -- node node_modules/vite/bin/vite.js build` — production build passed under the pinned runtime.
- Fresh local Git clone: `npm ci --offline --no-audit --no-fund && npm test && npm run build` — cache-only installation, 22 tests passed, build passed. This clone used host Node 24.16.0 and emitted the expected exact-engine-version warning; pinned-runtime checks were performed separately as above.
- `curl --fail --silent --show-error -I http://localhost:5173/` — dev server returned HTTP 200.
- `git diff --check` — no whitespace errors.

## Functional coverage

Automated tests inspect the three original conflict excerpts, edit claim wording, verify immediate brief changes, exercise report add/edit/remove and reanalysis, confirm approval warnings/cancellation, require deliberate claim review, invalidate approval after edits, remove stale demo excerpts, restore local state after remount, search original excerpts, reset the demo, focus/dismiss the source dialog, handle clipboard success/failure, and create/revoke a Markdown download URL. Pure-logic tests verify original-evidence preservation, citations, malformed storage, and irrelevant-claim exclusion.

The report CRUD test previously exceeded the default five-second limit when it performed repeated whole-page accessible-name queries. The test now scopes queries to the source, evidence, and review regions and uses unique headings for claim cards. The blanket timeout increase was removed; the CRUD test and two consecutive full suites pass with the default five-second timeout. No tests are skipped.

## Official requirements checked

Authoritative source: [omnirush.ai/buildathon](https://omnirush.ai/buildathon), checked October 19, 2026.

- Deadline: **20 October 2026, 11:59 PM IST**.
- Required submission destination: OmniRush buildathon dashboard at `https://omnirush.ai/console/buildathon`; add the Human × AI track, public GitHub repository, and OmniRush sessions there.
- After dashboard submission, copy the generated Submission ID into the Unstop event page: `https://unstop.com/p/omnirush-agentic-buildathon-2026-omnirush-1769914`.
- Repository: public GitHub repository owned by the connected GitHub account.
- Video/live link: neither is required; a 2–3 minute demo video is recommended and a live link is optional when hosting is possible.
- AI/tool rule: OmniRush must be the only generative AI tool used for code, text, or images. Normal documentation/search tools are allowed. Participation is solo, and judges check that the project was built in recorded OmniRush sessions.
- Runtime AI: the official guide does not require the submitted app to call an AI model at runtime. Proofline's offline deterministic behavior is therefore compatible, but it must not be described as live AI inference.
- Rebuild checklist: README, lockfile, pinned language version, Dockerfile, one offline test command, `.env.example`, and no computer-specific paths.

## Not verified / submission blockers

- Docker command returned `docker: command not found`. Container builds, container serving, and `docker run --network none` tests **have not passed here**. The Dockerfile and procedure are included; run the README commands on a Docker-capable machine before submission.
- A built-in browser tab exists but is awaiting website-access approval in the browser panel. No real-browser visual, responsive, or download-to-disk walkthrough has been verified. jsdom checks do not replace this.
- The official page was inspected, but the entrant's buildathon dashboard, account join state, session list, recording capture/export, and Submission ID have not been inspected or certified.
- The product contains no runtime generative AI. Its exact demo is curated; arbitrary reports receive conservative unverified sentence extraction. Do not describe this as general semantic contradiction detection or live AI inference.
- Git commits are local. No remote push or competition submission was performed.

## Before presenting

1. Open the running application or start `npm run dev`.
2. Load/reset the demo, accepting the reset confirmation.
3. Inspect the network-cause conflict and its three source excerpts.
4. Edit wording or add a note, then deliberately approve claim review.
5. Open the brief, demonstrate retained uncertainty and the battery/connectivity investigation recommendation.
6. Test approval cancellation, approval with risks, and invalidation after another edit.
7. Download Markdown and inspect the actual file; test clipboard permissions.
8. Resize to laptop and phone widths and navigate the source dialog by keyboard.
9. Run the Docker/offline checks and complete the official recording/submission process.
