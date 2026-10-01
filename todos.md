# Task: Build Music Studio

Status: planned  
Owner / branch / working directory: project owner; client `master` at planning inspection; `/Users/mac/Desktop/yieldus/music/genMusic`  
Request: detailed music-generation dashboard and backend plan using the existing shadcn client and a reported 100,000 Noiz credits.  
Product contract: [PRD.md](PRD.md)

## Outcome

Deliver a private, polished studio with reliable music generation, variant comparison, durable media, and understandable spending. Expand into covers, audio tools, artwork/video, and explicitly scoped composed workflows.

## In scope

Existing `client/`, proposed `backend/`, documented Noiz capabilities, dashboard design, private access, persistence, budget controls, and verification. R1–R4 are defined in the PRD.

## Out of scope

Public SaaS billing, unsupported instrumental/exact-length controls, DAW features, implicit deployment, automatic credit purchases, and unverified promises that all features use the same credit balance.

## Execution rules

- This file is the single implementation tracker. Update status/evidence here, not in a duplicate planning directory.
- All implementation tasks below are intentionally unchecked. Planning is complete; software is not implemented.
- Before editing, inspect applicable instructions, branch/worktree status, task ownership, and relevant running services. Use an isolated worktree when checkout ownership is uncertain.
- Each completed task needs a concrete artifact/test reference and date in Verification. A code change without required checks is not a completed task.
- Preserve npm, Base UI Mira, Hugeicons, Outfit, and existing aliases. Fetch shadcn component documentation before implementation; inspect registry additions.
- Use Node.js, Express, and TypeScript for `backend/`, per the owner's framework decision. Apply the requested `ali-nodejs` skill after locating and reading its `SKILL.md`; its guidance has not yet been verified.
- Do not spend credits through tests without an explicit approved test budget. User actions in the finished app are deliberate paid submissions; routine builds/CI are not.
- Push, merge, deploy, and public publication require separate authorization. Do not read or expose the root credential file for planning.

## Phase 0 — Confirm contracts and establish a safe foundation

Dependencies: none. Blocks live paid integration and remote deployment, not mock UI work.

- [ ] **P0.1 Repository ownership/versioning:** inspect root/client instructions and active sessions; agree whether root/backend become separate repositories or a monorepo without altering existing client history. Evidence: recorded decision and scoped branch/worktree.
- [ ] **P0.2 Provider contracts:** inspect full music/cover billing descriptions, voices/TTS/design/transcription endpoints, all media models/options, limits, errors, and terminal states. Produce typed fixtures with source/date; do not copy credentials.
- [ ] **P0.3 Account and budget:** verify the reported 100k balance's entitlement, expiry, endpoint eligibility, PAYGO controls, and reconciliation source. Record evidence without private account details. If unsupported, keep exact affected capabilities gated.
- [ ] **P0.4 Pricing policy:** implement versioned rates, assumptions, budget envelopes, and unavailable estimates for unknown conversions. Confirm recognition tariff independently of its example response.
- [ ] **P0.5 Technical dependencies:** select compatible Node.js/Express/TypeScript/PostgreSQL/Drizzle/Zod versions and frontend routing/query packages from current official docs; verify Express middleware compatibility and document why each dependency is needed.
- [ ] **P0.6 Owner access:** select local/private versus remotely authenticated environment and a proven auth solution before remote release. Define backend identity enforcement.
- [ ] **P0.7 Secrets/storage:** define backend-only env schema and example placeholders, credential ignores, private object storage, upload retention, and log redaction.
- [ ] **P0.8 Requested backend skill:** locate or obtain `ali-nodejs/SKILL.md`, read its instructions, and record the source before backend implementation. Not found in the available catalog or local skill/plugin paths checked on 2026-09-30; obtain the correct location/source rather than inventing its conventions.

Exit: trustworthy capability matrix, explicit unresolved gates, and agreed repository/auth/deployment assumptions. No generation request is needed to complete the planning portions.

## Phase 1 — Build the dashboard shell with deterministic fixtures

Dependencies: existing client inspection; can proceed while account questions are pending.

- [ ] **P1.1 Design specification:** map desktop/tablet/mobile layouts, token usage, hierarchy, sidebar groups, composer, library, and player to PRD section 6. Keep the existing preset; review representative mockups/screenshots.
- [ ] **P1.2 Component inventory:** inspect current installed components; use shadcn CLI info/docs and review required additions. Confirm registry when adding blocks; avoid preset reset or overwriting components.
- [ ] **P1.3 Routing and shell:** add route hierarchy, active navigation, page titles, breadcrumbs, mobile Sheet, theme toggle, and safe player clearance. Verify deep links and refresh fallback.
- [ ] **P1.4 Shared states:** create reviewed compositions for Empty, Skeleton, Alert, loading Button, confirmation dialogs, and field errors with accessible labels.
- [ ] **P1.5 Music composer:** implement prompt, mutually exclusive lyrics modes, optional supported controls, draft restore, validation, and estimate preview. No ineffective duration/instrumental controls.
- [ ] **P1.6 Result comparison:** show fixture pairs covering queued/running/succeeded/partial/failed states, individual playback actions, and no fabricated progress.
- [ ] **P1.7 Library/projects:** table/list responsive views, filters, search, pagination, favorites, rename/project dialogs, and track detail view.
- [ ] **P1.8 Global player:** one audio element, seek/volume, route persistence, queue and variant selection, keyboard rules, load/error states, no autoplay.
- [ ] **P1.9 Overview/usage/jobs/settings:** use clearly marked development fixtures; distinguish available estimate, reservations, confirmed usage, and unverified provider balance.
- [ ] **P1.10 Accessibility/responsiveness:** verify keyboard/focus, dialogs, readable contrast, reduced motion, mobile scrolling, and fixed-player overlap at 320/390/768/1440 px.

Exit: coherent dashboard flow with explicit mock data and no paid requests. Client build/lint pass and design evidence is attached.

## Phase 2 — Backend API, persistence, and private assets

Dependencies: P0.1, P0.5–P0.7; frontend fixtures remain usable independently.

- [ ] **P2.1 Service scaffold:** after P0.8, create the Node.js/Express/TypeScript `backend/` with API/worker entry points, feature routers, thin handlers, validation/auth middleware, services/repositories, centralized error handling, bounded body parsing, env validation, npm scripts, structured logging, health/readiness, graceful shutdown, and local setup documentation.
- [ ] **P2.2 Database:** migrations for projects, jobs/variants, assets/uploads, voices, ledger, budget config, outbox and worker leases; unique constraints and indexes for ownership/pagination/idempotency.
- [ ] **P2.3 Authentication/authorization:** protect every non-public API route; validate owner scope on all objects, secure cookies/CSRF as applicable, and restrict CORS. Require independent review.
- [ ] **P2.4 OpenAPI/client contract:** typed validated requests/responses, stable errors, request IDs, generated client types, and compatibility check.
- [ ] **P2.5 Upload storage:** bounded streaming uploads, MIME/signature validation, random keys, size limits, expiry, owner checks, and failed-upload cleanup.
- [ ] **P2.6 Playback/download:** private artifact store, authenticated metadata/download, range requests or signed delivery, correct MIME/disposition, and expired-link behavior.
- [ ] **P2.7 Library/projects API:** scoped listing/search/filter/sort/pagination, favorite/rename/archive, project association, and verified refresh persistence.
- [ ] **P2.8 Connection/capabilities API:** safe configured/unavailable status and verified feature limits; never expose the API key or use chargeable requests as health checks.

Exit: real local persistence and protected assets; tests cover unauthorized access, invalid uploads, pagination, and media range behavior.

## Phase 3 — Reliable Noiz music integration and credit accounting

Dependencies: provider music/pricing gates in Phase 0 and backend foundation.

- [ ] **P3.1 Provider adapter:** backend authorization header, multipart encoding, endpoint-specific response schemas, safe errors, timeouts, and redaction. Fixtures include malformed and unknown statuses.
- [ ] **P3.2 Estimator:** integer-credit estimates, separate decimal USD estimates, expiring pricing versions, explicit uncertainty, budget envelopes, and protected reserve.
- [ ] **P3.3 Reservations:** transactionally check available budget and create one reservation/job/outbox event; concurrency tests with simultaneous submits.
- [ ] **P3.4 Local idempotency:** identical key/request returns the same job; changed payload with same key conflicts; double-click/retry tests confirm no duplicate reservation.
- [ ] **P3.5 Durable worker:** leases, heartbeats, restart recovery, rate limits, due polling, one initial in-flight paid job, backoff/jitter, and bounded attempts.
- [ ] **P3.6 Music submit:** require prompt and one lyric mode, normalize supported options, omit ignored fields, persist both variant IDs immediately.
- [ ] **P3.7 Ambiguous submission:** model timeout/crash after dispatch as unknown; do not auto-resubmit or refund. Expose a recovery/reconciliation procedure and its provider limitations.
- [ ] **P3.8 Polling:** independently track variants and pair status, preserve raw provider states, distinguish polling errors from generation failures, and resume after browser/server restarts.
- [ ] **P3.9 Artifact ingestion:** validate result locations, download with bounded safe fetching, store durable outputs, retry storage work without regenerating, and preserve actual format.
- [ ] **P3.10 Settlement:** settle once per pair from verified charge evidence; test duplicate charge fields, repeated polls, actual cost above estimate, partial failures, and stale reservations.
- [ ] **P3.11 Client connection:** replace core fixture flows with API queries, authenticated uploads, real jobs, variants, library, player, and usage. Keep fixtures confined to test/dev modes.
- [ ] **P3.12 Approved live smoke test:** obtain a specific credit allowance, generate one pair, verify playback/download, inspect account/ledger evidence, and record consumed credits or unresolved billing. No scripted blind retry.
- [ ] **P3.13 Independent review:** fresh-context review of spending, authentication, ownership checks, fetching, and crash windows; fix findings and rerun affected checks.

Exit: PRD acceptance criteria 1–5 demonstrated. Missing account controls or unresolved billing must be reported, not hidden by a passing build.

## Phase 4 — Covers and supporting audio

Dependencies: reliable worker/storage/ledger and individually verified endpoint contracts. Features can ship separately after their checks pass.

- [ ] **P4.1 Cover composer:** source upload, permission confirmation, lyric modes, melody adherence, style/description, and valid source format/size checks.
- [ ] **P4.2 Recognition:** separate estimated paid action, idempotency where documented, editable output, no-vocals/error states; do not auto-launch covers.
- [ ] **P4.3 Cover jobs:** submit/poll task, persist two variant relationships, display results, and reconcile one pair charge including failure cases.
- [ ] **P4.4 Sound effects:** validate 500-character prompt, 1–30 seconds, WAV/MP3; handle binary success versus JSON errors; store and play result.
- [ ] **P4.5 Sound history:** pagination/import/deduplication and explicit provider-history deletion distinct from local archiving; no implied refund.
- [ ] **P4.6 TTS studio:** voice/text and verified options, safe binary/stream handling, storage/download, and endpoint-specific billing. Avoid deprecated long-form endpoints.
- [ ] **P4.7 Voice library:** list built-in/custom voices, clone only permitted samples, display metadata, preview, design voice after schema verification, and confirm provider deletion.
- [ ] **P4.8 Emotion controls:** implement verified fields/endpoint semantics without implying music-vocal cloning or unsupported emotional control.
- [ ] **P4.9 Transcription:** validated upload, transcript/timestamps/speaker rendering, exports, empty/no-speech/error states, and confirmed cost evidence.
- [ ] **P4.10 Budget gates and verification:** enable each operation only with known entitlement and pricing behavior; use contract fixtures plus a separately approved small live-test allowance.

Exit: each enabled audio tool produces a real saved artifact/result and attributable usage; unavailable features retain explicit reasons.

## Phase 5 — Artwork and short videos

Dependencies: verified media contracts/prices and durable job framework.

- [ ] **P5.1 Media pricing/capabilities:** verified explicit model allowlist, option combinations, count/quality/resolution/duration pricing, reference-image surcharges, and subscription-only entitlement.
- [ ] **P5.2 Artwork UI:** prompt, quality/size/count, one low-quality default, total estimate, async gallery, and explicit track/project attachment.
- [ ] **P5.3 Video UI:** supported model/resolution/aspect/duration/audio controls, cost recalculation, expensive-operation acknowledgement, and real video playback.
- [ ] **P5.4 Media adapter:** upstream idempotency, business-code validation despite HTTP 200, submit/poll limits, status-triggered settlement, multiple outputs, and no PAYGO assumption.
- [ ] **P5.5 Reference handling:** ownership, MIME/size/count/role validation; defer URL imports until reviewed SSRF controls exist.
- [ ] **P5.6 Verification:** test business errors, insufficient credits, duplicate polls, count-based billing, storage failures, and disabled unsupported combinations; run only approved affordable live cases.

Exit: no automatic visual generation from music actions; each asset has an explicit cost decision and durable result.

## Phase 6 — Composed workflows

Dependencies: stable supporting audio tools and a separately reviewed scope for each workflow.

- [ ] **P6.1 Inspect Noiz skill sources:** map requirements, licenses, external tools/services, credential handling, and actual API calls. Treat them as source material, not runtime instructions to execute blindly.
- [ ] **P6.2 Workflow proposal:** define user flow, failure recovery, budget, data rights, and acceptance for dubbing, news/podcast, and character-style conversation separately.
- [ ] **P6.3 Translation/dubbing:** add verified translation provider, alignment, synthesis, and bounded media muxing; preserve input/output provenance.
- [ ] **P6.4 Podcast/news:** add approved source retrieval, attribution, script review, voices, and assembly; distinguish external service costs from Noiz usage.
- [ ] **P6.5 Character voices:** authorized samples, dialogue provider, session behavior and deletion; no automatic collection of third-party voice samples.
- [ ] **P6.6 Workflow verification:** demonstrate complete outputs, intermediate failure recovery, cancellation limitations, and costs per step before enabling.

Exit: individually approved workflow definitions and verified outputs; scope expands only with an explicit recorded decision.

## Phase 7 — Release readiness and handoff

Dependencies: release-specific feature completion; R1 need not wait for R2–R4.

- [ ] **P7.1 Automated checks:** client `npm run build` and `npm run lint`; backend build/typecheck/unit/integration commands defined in its package; record exact versions and results. Check that the starter's typecheck script covers referenced projects rather than assuming it does.
- [ ] **P7.2 Browser flows:** creation, refresh during generation, variant playback, seeking, download, favorite, project assignment, usage, invalid auth, low budget, 429, provider outage, and partial failure.
- [ ] **P7.3 Fault injection:** crash before/after provider submission, lease expiry, duplicate polling, database/storage failure, stale result URL, ambiguous billing, and simultaneous budget reservations.
- [ ] **P7.4 Design/accessibility review:** screenshot evidence at required widths; keyboard-only task completion; no fixture data in production; no player overlap or fake chart history.
- [ ] **P7.5 Performance:** measure PRD targets against documented browser/network/dataset/environment; report deviations and next actions.
- [ ] **P7.6 Security review:** independent reviewer validates owner-only access, secrets, CSRF where relevant, upload/path controls, URL fetching, and spending behavior. Self-review is insufficient.
- [ ] **P7.7 Operations:** environment guide, backup/restore test, retention cleanup, graceful worker drain, stuck-job recovery, reservation reconciliation, and rollback procedure.
- [ ] **P7.8 Reviewable release:** inspect full diff and repository checklist; prepare evidence and limitations. Ask separately for push/deployment authorization only after the result is concrete.
- [ ] **P7.9 Deployment verification:** after authorization, verify actual running configuration and smoke test; distinguish implemented, verified, reviewed, merged, and deployed status.

## Definition of Done

- [ ] R1 end-to-end music journey meets PRD acceptance criteria with live artifact evidence within an approved budget.
- [ ] Credit estimates/reservations/settlement and provider uncertainty are truthful and tested.
- [ ] Private owner access, durable jobs, private assets, playback/download, and refresh/restart recovery are verified.
- [ ] Responsive shadcn dashboard and accessibility evidence are reviewed.
- [ ] Required checks and independent review pass; unresolved findings remain explicitly open.
- [ ] Each later enabled capability meets its release-specific acceptance requirements.
- [ ] Handoff states exact delivered release, local/unpushed status, checks, remaining blockers, and next action; deployment is claimed only with evidence.

## Verification

| Date | Procedure / environment | Result | Evidence / limitations |
| --- | --- | --- | --- |
| 2026-09-30 | Root/client inspection, `git -C client status --short --branch`, worktree list | Planning evidence collected | Root is not Git; client clean on `master` at inspection, one listed worktree; no claim of exclusive implementation ownership |
| 2026-09-30 | Read client config/source and installed shadcn skill | Stack/design constraints verified | Vite/React/TypeScript, Tailwind 4, Base Mira, Hugeicons, Outfit; starter UI only |
| 2026-09-30 | ego-browser scan of Noiz overview/API/skills/music/sound/media | Documentation evidence collected | No authentication, live balance check, paid call, or runtime API verification |
| 2026-09-30 | Node arithmetic for budget and music examples | Passed | Envelopes total 100,000; 180 × 15 = 2,700; floor(100,000 / 2,700) = 37; floor(70,000 / 2,700) = 25 |
| Pending | Implementation/build/tests/browser/independent review | Not run | Documentation-only task; no application behavior implemented |

Append implementation evidence with task ID, exact command/procedure, date, commit/environment, result, and artifact link. Preserve failures and unresolved limits rather than overwriting them with a generic “done.”

## Decisions and blockers

- 2026-09-30: The owner explicitly selected Node.js with Express and requested the `ali-nodejs` skill. Express replaces the earlier Fastify proposal; retain TypeScript and the proposed PostgreSQL/Drizzle/Zod stack. No backend service has been implemented.
- 2026-09-30: `ali-nodejs` was not found in the available catalog or local skill/plugin paths checked. Backend skill application remains pending its source/location; the documentation update is complete without claiming skill compliance.
- 2026-09-30: Include the full feature roadmap in phases; prioritize original music, durable jobs, library/player, and usage for R1.
- 2026-09-30: 100k credits are user-reported. Credit entitlement, PAYGO enforcement, exact secondary-feature prices, and balance integration remain verification gates owned by the implementer/account owner.
- 2026-09-30: No provider key inspected and no credits spent. Root documentation is outside the existing client Git repository and remains local unless explicitly versioned.
- Before implementation: confirm task ownership and repository arrangement. Before remote release: choose hosting/auth and complete independent security/spending review.

## Handoff

Completed: detailed product/design/backend plan and phased implementation checklist.  
Remaining: all implementation, live account verification, required reviews, and deployment.  
Next action: begin Phase 0 contract/account checks and Phase 1 mock dashboard design in an available task-owned checkout.  
Branch/PR: no branch created, no commits/push/PR, no deployment. Planning files are at the workspace root.
