# PRD: Music Studio

Status: planning complete; implementation not started  
Date: 2026-09-30  
Owner: project owner  
Working directory: `/Users/mac/Desktop/yieldus/music/genMusic`  
Client: `client/`, existing Git repository on `master`  
Backend: proposed `backend/`, not created by this planning task  
Execution record: [todos.md](todos.md)

## 1. Product outcome

Build a polished, private music creation dashboard where the owner can generate songs, compare two variants, create covers, organize and play tracks, and understand spending. Extend the same workspace with sound effects, speech, custom voices, transcription, artwork, and short video generation through Noiz.

The owner reports an existing Noiz account with 100,000 credits. This is a planning input, not a verified API balance or proof that every endpoint accepts those credits. No credentials were read and no paid requests were made for this document.

The first release must complete the real journey: write a song brief → submit safely → survive refresh/restart → receive both variants → listen and choose a favorite → download → inspect the resulting charge. Secondary studios follow after that journey works.

## 2. Audience and scope

Primary user: the owner, creating music and supporting assets for personal creative projects. Initial deployment is a single-owner private workspace. If remotely reachable, authentication is mandatory; knowing the frontend URL must never grant access to the shared Noiz credits.

### Delivery scope

| Release | Included outcome |
| --- | --- |
| R1: music core | Dashboard, original songs, two-variant comparison, persistent jobs, player, library, projects, downloads, usage ledger, settings, private access |
| R2: audio studio | Covers and lyric recognition, sound effects, TTS, voice management/cloning/design, transcription, emotion controls where supported |
| R3: visual assets | Artwork and short videos associated with tracks/projects, explicit per-model cost previews |
| R4: composed workflows | Video translation/dubbing, podcast/news narration, character-style voice experiences after separate dependency and cost verification |

All releases are part of the product roadmap. A release gate is not permission to silently omit a feature. Unsupported or unverified functions must have an honest unavailable state rather than a working-looking button.

### Out of scope

- Public signup, subscriptions, customer billing, multi-tenant SaaS, team collaboration, and public publishing.
- Full DAW editing, mastering, stem separation, guaranteed song length, song extension, and voice-to-singing conversion without verified provider support.
- Instrumental-only mode through the current YuE2 music endpoint.
- Automated browsing, arbitrary agent execution, or installing Noiz skills in the server request path.
- Claims about commercial rights or provider retention not supported by current terms.
- Deploying, purchasing services, or consuming credits as part of writing these plans.

## 3. Observed environment and architecture decisions

The existing client is a starter, not a completed dashboard. It has React 19, TypeScript 6, Vite 8, Tailwind 4, an npm lockfile, and shadcn configured with `base-mira`, Base UI primitives, Hugeicons, Outfit Variable, neutral semantic colors, and `@/` aliases. Only the Button UI component was found installed. Existing scripts include `dev`, `build`, `lint`, `typecheck`, and `preview`.

Preserve this stack and preset. Use npm. Do not replace it with Next.js or Radix components. The parent folder is not a Git repository; `client/` is its own repository. Decide how root documentation and `backend/` will be versioned before backend implementation; do not move or rewrite the client repository implicitly.

### Backend framework decision

Use Node.js with Express and TypeScript in `backend/`, as explicitly selected by the owner on 2026-09-30. This supersedes the earlier Fastify proposal. Retain the proposed Zod validation, PostgreSQL, and Drizzle migrations; select compatible maintained versions during implementation. No backend dependencies have been installed by this documentation update. Share runtime schemas through a generated OpenAPI client rather than importing backend internals into the frontend.

The owner requested the `ali-nodejs` skill for backend implementation. It was not listed in the available skill catalog or found in the local skill/plugin paths checked on 2026-09-30. Locate or obtain its `SKILL.md` and read it before beginning skill-guided backend implementation; do not claim its conventions have already been applied. This missing skill does not block recording the Express decision or planning the frontend.

Organize Express routes by feature, with thin request handlers, validation/authentication middleware, service functions for generation and billing, and repositories for persistence. Use centralized error handling, bounded JSON/multipart input handling, and request IDs. Keep durable generation/polling work in the separate worker rather than tying it to HTTP request lifetimes. Verify middleware compatibility and error propagation against the selected Express version.

Run an API process and a worker process from `backend/`. Use PostgreSQL-backed durable jobs with leases, heartbeat, and bounded retries initially; no Redis is needed for the first private workspace. A transactional outbox ensures accepted jobs cannot disappear between reservation and enqueueing. Use private S3-compatible object storage in production and an explicit development storage adapter locally.

The client uses React Router for routes and TanStack Query for server state. Keep the player in a shell-level React context and use local component state for transient form edits. Add libraries only when their phase requires them.

```text
client (React dashboard)
  -> authenticated same-origin /api/v1
backend API -> PostgreSQL (jobs, assets, ledger, projects)
            -> private upload/object storage
backend worker -> Noiz API -> private stored results
client <- job polling and authenticated media access
```

Production should reverse-proxy the client and API under one origin. Development uses a Vite API proxy. Port selection must follow a running-service check.

## 4. Provider capabilities and limitations

Evidence was read with ego-browser on 2026-09-30. Documentation behavior is not runtime-tested behavior.

| Capability | Documented contract | Product implication |
| --- | --- | --- |
| Authentication | Base `https://noiz.ai/v1`; `Authorization: YOUR_API_KEY` | Server-side key only; do not automatically prepend `Bearer` |
| Original songs | `POST /text-to-music`; `GET /text-to-music/{gen_product_id}` | Multipart submission; two variant IDs; poll each |
| Song inputs | Prompt plus lyrics or lyrics prompt; optional title, tags, negative tags, vocal gender | Require prompt despite inconsistent optional schema label; lyrics modes mutually exclusive |
| YuE2 limits | `instrumental=true` rejected; duration, reference audio, `mv`, and `auto_lyrics` ignored | Do not expose ineffective controls; use `lyrics_prompt` for automatic writing |
| Lyrics file | UTF-8 `.txt`, maximum 64 KB | Validate server-side; verify exclusivity with other lyrics inputs before enabling |
| Covers | `POST /text-to-music/cover`; `GET /text-to-music/cover/{task_id}` | Source audio, lyrics, melody adherence, and style or music description; two variants |
| Cover source | File, public URL, or owned provider path; files up to 100 MB | App initially supports private uploads; do not expose arbitrary provider paths |
| Lyric recognition | `POST /text-to-music/cover/recognize-lyrics` | Separate paid operation before cover submission; editable recognized lyrics |
| Sound effects | `POST /text-to-sound`; prompt up to 500 chars; duration 1–30 seconds; WAV/MP3 | Binary response, not JSON; persist audio before completing local job |
| Sound history | `GET /text-to-sound-history`; `DELETE /text-to-sound-history/{gen_product_id}` | Provider deletion is distinct from local archive/delete |
| Voices | List, clone, details, delete through `/voices` resources | Voice library; verify exact payloads before implementation |
| Speech | `/text-to-speech`, voice design, speech-to-text, emotion enhancement | Verify endpoint-specific schemas; deprecated long-form TTS must not be the foundation |
| Media | `POST /media/generate`; `GET /media/{gen_product_id}` | Images/videos, async; inspect body business code even when HTTP status is 200 |
| Media output | Images PNG/JPEG; count 1–4; videos 4–15 seconds | Validate model-specific combinations, not just broad schema bounds |
| Agent skills | TTS, Chat with Anyone, Characteristic Voice, Video Translation, Daily News Caster, Voice Cloning | Workflow examples, not proof of equivalent turnkey API endpoints |

No documented connection between a cloned speaking voice and the singing voice of YuE2 was established. Do not offer “sing with my cloned voice.” No reliable music cancellation endpoint, balance endpoint, or music submission idempotency support was verified.

### Billing evidence

- Music/cover examples describe one charge per pair based on `ceil(longer variant duration) × 15` credits; reported PAYGO fallback is about $0.00015/second if credits cannot cover the whole job.
- Omitting music `target_duration` uses a 180-second, 2,700-credit preflight assumption. This is not a duration cap or a maximum final charge. Cover preflight also assumes 2,700 credits.
- Music submission and sound generation document 5 requests per 60 seconds. Media submission documents the same; media polling documents 60 per 60 seconds. Other limits need verification.
- Sound generation lists $0.001/second. Overview prices list TTS at $15/million characters, voice design at $0.30/generation, and transcription at $0.0006/second. Credit conversion and account eligibility for these services are unverified.
- Media lists images at 500 credits for low quality and 1,000 for medium, per image. Video rates: MiniMax H3 768P/2K at 250/500 credits per second; Seedance 480p/720p/1080p at 3,000/6,000/16,000 credits per second. Extra reference-image charges may apply. Validate model IDs and allowed options before use.
- Media documentation states subscription-credit settlement only, no PAYGO, and settlement upon observing successful status. Workers must poll independently of an open browser.

## 5. Credit budget and spending behavior

Proposed envelopes, totaling 100,000 credits:

| Envelope | Credits | Policy |
| --- | ---: | --- |
| Original songs and covers | 70,000 | Primary creative budget |
| Supporting audio and artwork | 15,000 | Enable credit-based estimates only after eligibility is known |
| Live integration validation | 5,000 | Explicitly approved small tests, not automatic CI traffic |
| Unallocated reserve | 10,000 | Excluded from ordinary spendable balance |

At an illustrative longest duration of exactly 180 seconds, one song pair costs 2,700 credits. The whole 100,000 would cover 37 such pairs (74 variants), whereas the 70,000 music envelope covers 25 pairs (50 variants). These are scenarios, not guaranteed capacity: actual duration, other features, external account usage, and account rules change the result. Calculations were checked programmatically.

The dashboard must distinguish:

1. Owner-reported starting allocation and adjustments.
2. Confirmed app-recorded charges.
3. Pending reservations for in-flight jobs.
4. Locally estimated remaining budget and last reconciliation time.
5. Provider balance only if a supported source can actually verify it.

Never label a local estimate “Live Noiz balance.” Use integer credits; store USD estimates separately with precise decimal handling. Store pricing versions, units, estimate assumptions, actual charges, and reconciliation evidence.

Reserve funds transactionally before enqueueing. Enforce available funds across tabs and workers, not in frontend state. Repeated status polling cannot charge the local ledger again. Adjust reservations to actual provider charges; unknown or ambiguous billing remains pending, not automatically refunded.

The product defaults to no intended cash spend. A local switch cannot disable provider PAYGO: confirm account-level enforcement before claiming a credit-only guarantee. Unknown final music duration also prevents a guaranteed hard per-job cap. Until provider controls are verified, describe limits as local submission controls and keep conservative concurrency (one paid job initially). If the provider cannot enforce the desired spending boundary, keep the affected operation unavailable until the owner accepts a revised policy.

Warnings: low budget, insufficient available reservation, unverified pricing, and stale reconciliation. Do not refill, purchase, or silently change providers. Retrying a paid generation is a new explicit action with a new estimate.

## 6. Information architecture and visual design

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Overview: create action, recent tracks, jobs, budget summary |
| `/create/music` | Original-song composer and latest variant pair |
| `/create/cover` | Source upload, recognition, editable lyrics, cover settings |
| `/library` | Searchable tracks/assets; favorites, projects, status/type filters |
| `/tracks/:id` | Playback, lyrics, provenance, sibling variant, metadata, usage |
| `/projects` and `/projects/:id` | Group tracks, sound, voiceovers, and visual assets |
| `/jobs` and `/jobs/:id` | Queue, progress, recovery status, attempts and errors |
| `/studio/sound` | Short sound-effect generation |
| `/studio/speech` | TTS and supported emotional style controls |
| `/voices` | Built-in/custom voices, cloning and design |
| `/studio/transcribe` | Audio transcription and export |
| `/studio/media` | Artwork and short videos |
| `/workflows` | R4 composed workflows with capability gates |
| `/usage` | Estimated budget, reservations, charges, adjustments, export |
| `/settings` | Connection status, workspace policies, theme, storage settings |

### Dashboard composition

Use a compact, professional creative-tool layout: collapsible desktop sidebar, restrained top bar, generous central workspace, and persistent bottom player. Default to dark neutral surfaces with an optional light theme and a single restrained accent defined in semantic tokens. Preserve Outfit and Mira density. Avoid oversized landing-page headlines, decorative charts, fabricated activity, and excessive card nesting.

Sidebar groups: Workspace (Overview, Create, Library, Projects), Studios (Covers, Sound, Speech, Voices, Transcribe, Media), Management (Jobs, Usage, Settings). Hide unreleased studios from primary navigation or label them clearly as unavailable without active paid controls.

Desktop composer uses two columns: prompt/lyrics on the left, generation state and variants on the right. At tablet width, stack panels while retaining clear primary actions. Mobile uses a navigation Sheet, stacked variant cards, compact player, and a detail Drawer. Ensure the fixed player does not cover content or focused inputs. Design at 390, 768, and 1440 px, and verify no horizontal overflow at 320 px.

Library uses a dense table on desktop and useful list cards on small screens. Track rows show title, variant label, project, duration, creation time, status, favorite, play, and overflow actions. Artwork is secondary; missing artwork uses a neutral placeholder rather than spending credits automatically.

### shadcn component plan

| Surface | Components |
| --- | --- |
| Shell | Sidebar, Breadcrumb, Separator, Tooltip, Sheet |
| Composer | FieldGroup, Field, FieldSet, Input, Textarea, Select, ToggleGroup, Button, Accordion |
| Jobs/results | Card with full composition, Badge, Progress, Skeleton, Alert, Empty |
| Library | Table, DropdownMenu, Checkbox, Pagination, Tabs |
| Details/player | Sheet/Drawer, Slider, Tooltip, ScrollArea |
| Usage | Chart, Card, Table, Tabs, Alert |
| Confirmation/search | AlertDialog, Dialog, Command, Sonner |

Use the installed shadcn skill during implementation. Inspect existing components first; run CLI docs before composing components and inspect proposed registry changes before installing. Preserve Base UI's `render` composition where appropriate, rather than copying Radix `asChild` examples. Confirm registry choice before adding blocks; hand-compose the dashboard from reviewed primitives.

Use semantic theme tokens in `client/src/index.css`, `cn()` for conditional classes, and gap-based layout. Use Hugeicons consistently. Forms require field descriptions and accessible validation; overlays require titles; Tabs and menu items require their proper parent groups. Use Empty, Skeleton, Alert, Badge, and Sonner rather than custom approximations.

### Accessibility and interactions

- Keyboard-accessible navigation, controls, menus, player, and dialogs; visible focus and meaningful icon labels.
- Target WCAG 2.2 AA contrast and interaction requirements. Honor reduced motion.
- No autoplay on generation completion. Only one audio source plays at a time.
- Space toggles playback only when focus is outside editable controls; shortcuts must not intercept typing.
- Announce meaningful job changes politely; do not announce every polling tick.
- Every page covers loading, empty, populated, recoverable error, unavailable, and narrow-screen states.
- Progress is indeterminate unless provider progress is available; never invent percentages or completion times.

## 7. Functional requirements

### F1 — Song creation

Fields: required song description; mode switch between “Write lyrics” and “Generate lyrics”; lyrics or lyrics prompt; optional title, style tags, negative tags, and supported vocal-gender preference. Preserve drafts locally, with an explicit clear action. Do not require both lyric modes. Do not expose unsupported instrumental or exact-duration controls.

Before submission show the operation, two expected variants, current pricing assumption, available local budget, and final-cost uncertainty. Disable only the submitted action, retain draft content on failure, and show field-level validation. Use a stable local idempotency key so double clicks and transport retries do not produce duplicate local jobs.

Results show two individually playable cards with their real statuses, duration, downloadable asset, favorite action, and lyrics/provenance. A partially successful pair remains visible and its billing remains unreconciled until established. Regenerate opens an editable copy of the request and requires an intentional new submission.

### F2 — Covers and lyric recognition

Upload source audio, validate type/size, show source metadata, and capture confirmation that the user has permission to use it. Start with uploads; URL input is deferred until SSRF protections are implemented. Accept MP3/WAV/FLAC/M4A/AAC/OGG subject to verified limits.

Offer manual lyrics or a separate “Recognize lyrics” action with its own cost notice. Let the user edit recognition output, including no-vocals results. Require `high` or `main_melody` adherence and music description or style. Present understandable labels explaining how closely melody is followed. Do not submit the cover automatically after recognition.

### F3 — Player, library, and projects

Persist player across navigation. Provide play/pause, seek, elapsed/duration, volume/mute, next/previous within a selected queue, and variant switching. Seeking must work through range-capable media serving. Refresh may restore selection but must not autoplay.

Support search, filters, sorting, pagination, favorite, rename, project assignment, download, and local archive. Store music pair relationships. Local archive does not delete provider history or refund credits. Permanent deletion requires explicit confirmation and a retention-aware procedure.

Projects group related assets without copying their media files. Downloads use real stored formats; never relabel a WAV as MP3. Transcoding is a separately implemented capability, not an implied export option.

### F4 — Jobs and recovery

Persist state and provider IDs before reporting submission success. The browser can close without stopping polling. Worker restart resumes due jobs. Users can cancel locally queued work before dispatch; a submitted job may be un-cancellable. “Stop watching” must not imply that billing stopped.

Display actionable errors for invalid credentials, insufficient funds, rate limiting, invalid inputs, unavailable provider, expired results, and ambiguous submissions. An uncertain POST outcome must not trigger an automatic new paid submission. Polling failures and generation failures are different states.

### F5 — Supporting audio tools

Sound effects: prompt, 1–30 second duration, WAV/MP3, preview/download, project association. TTS: text, validated voice selection, language/style/format controls only as supported. Voice library: built-in/custom distinction, previews, cloning with permission confirmation, details and separately confirmed deletion. Voice design: text/image inputs only after contract verification. Transcription: upload, detected language, text, timestamps and speaker data where returned, copy/export.

Guest TTS is not a fallback for exhausted credits or authentication failure. Long-form speech should use the currently documented streaming approach after verification. Voice features do not modify the music model's singing voice.

### F6 — Visual assets

Artwork generation accepts a prompt, allowed size/quality, and count, defaulting to one low-quality image. Attaching generated artwork to a track is explicit. Short videos require an explicit allowed model, duration, resolution, aspect ratio, and audio choice. Display total estimated cost before submitting; expensive presets require additional acknowledgement within the normal generation flow.

Do not automatically generate images/videos when creating a track. Validate reference-image counts, roles, model combinations, and surcharges. Media jobs use the same durable lifecycle while retaining provider-specific billing rules.

### F7 — Composed workflows

Treat Noiz skills as design references requiring source inspection, not commands to execute on the server. Video dubbing needs transcription, translation, timing, synthesis, and media muxing. News podcasts need a news source, script generation, attribution, voice rendering, and assembly. Character-style conversations need dialogue generation and authorized voice samples; avoid automatic acquisition of third-party voices.

Translation, news sourcing, dialogue/LLM services, storage, and processing may have separate costs not covered by Noiz credits. Each workflow requires its own reviewed scope, dependency list, rights/input policy, and budget before activation.

## 8. Backend data and API plan

### Core records

| Record | Essential data |
| --- | --- |
| Owner/session | Single-owner identity, session expiry, secure session reference |
| Project | Owner, name, timestamps, archive status |
| Generation job | UUID, owner, kind, normalized request, request hash, local idempotency key, status, provider task ID, estimate, pricing version, timestamps, error class |
| Variant | Job, provider product ID, index, raw/normalized status, duration, provider progress, asset, billing metadata |
| Asset | Owner, project, job/variant, kind, private storage key, real MIME, bytes, duration/dimensions, checksum, favorite/title |
| Upload | Owner, validated type/size, storage key, expiry, processing status |
| Voice reference | Owner, provider voice ID, origin, name, permission record, deletion status |
| Ledger entry | Owner, job, kind, integer credits, optional separate USD amount, unique settlement key, source, pricing version, timestamp |
| Worker/outbox record | Job, due time, attempt, lease owner/expiry, heartbeat, last error |
| Budget configuration | Allocations, reserve, concurrency, manual reconciliation and provenance |

Database constraints enforce unique local idempotency keys per owner and operation, unique provider variant IDs, and unique settlement events. A job can produce multiple assets. Store raw provider status for diagnosis without leaking credentials or signed URLs into logs.

### Application endpoints (our API, not Noiz endpoints)

| Endpoint | Behavior |
| --- | --- |
| `GET /api/v1/session` | Current owner/auth state |
| `GET /api/v1/capabilities` | Enabled operations, input limits, verified pricing and limitations |
| `POST /api/v1/estimates` | Server-generated estimate with pricing version and expiry; no provider generation |
| `POST /api/v1/uploads` | Authenticated bounded upload; returns owned upload ID |
| `POST /api/v1/jobs` | Validate kind/input, check idempotency, reserve budget, enqueue; return 202 and job ID |
| `GET /api/v1/jobs` and `GET /api/v1/jobs/:id` | Cursor-paginated jobs and normalized variants |
| `POST /api/v1/jobs/:id/cancel` | Only supported pre-dispatch cancellation; otherwise explicit conflict |
| `GET /api/v1/assets` and `GET /api/v1/assets/:id` | Owner-scoped metadata/search |
| `PATCH /api/v1/assets/:id` | Rename, favorite, archive, project assignment |
| `GET /api/v1/assets/:id/content` | Authorized playback/range support or short-lived signed access |
| `GET /api/v1/assets/:id/download` | Authorized attachment download |
| `/api/v1/projects` | Owner-scoped list/create/update/archive |
| `/api/v1/voices` | Owner-scoped verified provider operations in R2 |
| `GET /api/v1/usage` | Aggregates plus ledger and reconciliation provenance |
| `POST /api/v1/usage/reconciliations` | Owner-only explicit adjustment with reason/source; no provider money movement |
| `GET /api/v1/connection` | Configured/invalid/unavailable state; never return the key |
| `/health/live` and `/health/ready` | Minimal process/dependency health, no secrets |

Errors use a stable application code, safe message, request ID, retryability, and field errors where relevant. Provider adapters must account for different success codes (music/media examples use 0, sound history examples use 200) and binary bodies. Never build a universal “HTTP 200 means success” parser.

### Job and settlement lifecycle

Local states: draft (client), queued, submitting, submitted, running, partially_succeeded, succeeded, failed, submission_unknown, reconciliation_required, cancelled_before_submission. Normalize provider states with an explicit mapping and preserve unknown states for investigation.

Claim jobs under a lease; commit submission intent before network dispatch. Persist returned IDs immediately. A network timeout after POST creates `submission_unknown`; do not release its reservation or retry blindly. Use upstream idempotency only where documented, such as media and lyric recognition. Local idempotency cannot provide exactly-once external submission across every crash window.

Poll with bounded exponential backoff and jitter, respecting per-endpoint shared limits. Initially allow one in-flight paid generation. Music polls both variant IDs; covers poll task ID; media polls product ID. Verify terminal outputs, copy them into private storage, then expose durable library assets. A storage failure should retry download, never generation.

Settle once using provider charge evidence. Do not sum duplicated pair charges from both music variants. For ambiguous/partial results keep reservations pending and surface a reconciliation task. Provider failures or timeouts alone are insufficient evidence of a refund. Polling timeouts create recoverable review states, not invented provider cancellation.

## 9. Security, operations, and quality

- Store `NOIZ_API_KEY` only in backend secret configuration. Never use a `VITE_` variable, frontend storage, browser request to Noiz, or committed credential file.
- The existing root `keys.md` was not read. Before versioning the root, ignore credential files and audit staged content; do not relocate secrets automatically.
- Remote access requires a proven authentication solution or authenticated access proxy with verifiable identity. Backend authorization must protect jobs, uploads, assets, voices, and usage independently of the UI.
- Secure session cookies and CSRF protection for cookie-authenticated mutations; bounded CORS only if cross-origin use is necessary.
- Validate upload content signatures, file sizes, MIME types, and ownership; randomized object keys; no user-controlled filesystem paths.
- Prefer upload-only source inputs initially. If URL imports are added, block private/link-local/metadata hosts and unsafe protocols, validate DNS and redirects, and apply download size/time limits. Apply safe-fetch controls to result downloads too.
- Keep credentials, lyric bodies, source media, and signed URLs out of routine logs. Record request/job IDs, operation, latency, status, and sanitized error categories.
- Retain failed-job diagnostics for a proposed 30 days, expire unused uploads after 24 hours, and retain saved assets until explicitly deleted; confirm policy before deployment.
- Back up database and stored media; verify restoration before production readiness. Use reversible migrations and preserve jobs/ledger during rollback.
- Add metrics for queue age, provider latency/errors, ambiguous submissions, storage failures, and reservation age. Do not promise provider generation SLAs.
- Performance targets: usable shell within 2.5 seconds on the agreed test profile, local job acceptance within 1 second at p95 excluding upload/provider execution, paginated library queries within 500 ms at p95 for a 1,000-asset fixture. Record environment and measurements.

## 10. Acceptance and release gates

1. **R1 journey:** one approved live song generation produces inspectable variant records, playable/downloadable outputs, and attributable ledger settlement. Refresh and API/worker restart do not lose the job.
2. **Duplicate safety:** duplicate browser submits create one local job/reservation; ambiguous provider POSTs do not automatically resubmit. Failure/crash tests document the remaining provider uncertainty.
3. **Budget correctness:** concurrent reservation tests prevent local oversubscription; repeated polling cannot double-settle; unknown charges remain visible; local estimates are never mislabeled as verified balance.
4. **Media access:** unauthorized users cannot create paid jobs or read another owner's job/upload/asset; range playback and downloads work after navigation and refresh.
5. **Design:** reviewed responsive screenshots and keyboard checks at the specified widths; all empty/error/loading states are intentional; no fake dashboard metrics.
6. **R2/R3 contracts:** every enabled tool has validated inputs, response parsing, real artifact evidence, cost behavior, and failure-state verification. Unknown entitlement keeps only that tool gated.
7. **Checks:** client build/lint, meaningful backend tests, contract fixtures, and critical browser flows pass. Paid API calls never run in ordinary CI.
8. **Independent review:** authentication, authorization, spending/ledger, upload fetching, and migration changes require a fresh-context reviewer; absence of review keeps release pending.
9. **Deployment:** distinct owner authorization, configured secrets, documented backup/rollback, smoke-test evidence. Implementation completion is not deployment completion.

## 11. Unresolved decisions and verification queue

| Question | Initial position / next action |
| --- | --- |
| Does the 100k account balance fund each endpoint? | Verify entitlement and billing source before enabling paid features |
| Can PAYGO be disabled at account level? | Verify before promising credit-only music generation |
| Is there a supported balance/history API for music? | Not found in pages inspected; use labeled manual reconciliation until verified |
| What are full TTS/voices/transcription schemas and limits? | Read exact endpoint pages before implementing R2 |
| What happens on one failed music variant? | Inspect full billing description and perform approved controlled validation |
| What are all allowed media model/options? | Verify exact values; do not rely on changing defaults |
| What is the recognition price? | Response example shows 100 credits but is not sufficient proof of a fixed tariff |
| What are result-URL lifetime and artifact rights? | Confirm provider terms/documentation before durable import/public distribution claims |
| How should root/backend be versioned? | Owner decision before repository restructuring |
| Where will the app run and how is owner login handled? | Local-first implementation; choose deployment/auth provider before remote release |

## 12. Sources

- [Noiz developer overview](https://developers.noiz.ai): dashboard and agent entry point.
- [API introduction](https://developers.noiz.ai/api-docs): authentication, endpoint groups, overview pricing.
- [Music API](https://developers.noiz.ai/docs-text-to-music): music, covers, recognition, YuE2 limitations and pricing examples.
- [Sound API](https://developers.noiz.ai/docs-text-to-sound): binary output, limits, history and price.
- [Media API](https://developers.noiz.ai/docs-media): image/video controls, pricing, business errors, settlement and polling.
- [Noiz skills](https://developers.noiz.ai/skills): available workflow descriptions; [skills repository](https://github.com/NoizAI/skills).
- Local evidence: `client/package.json`, `client/package-lock.json`, `client/components.json`, `client/src/index.css`, `client/src/App.tsx`, and installed shadcn skill.

Planning evidence: pages inspected without signing in or sending generation requests; arithmetic checked using Node.js. Provider functionality, entitlement, live balance, and application behavior remain unverified until implementation tests.
