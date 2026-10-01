# API Contract — Music Studio R1

Shared contract between `backend/` and `client/`. Source of truth for both agents. Product rules live in [PRD.md](PRD.md).
Date: 2026-09-30. Scope: R1 music core. R2–R4 are gated (capabilities report them `available: false`).

## Runtime

- Backend: Express 5 + TypeScript, PostgreSQL + Drizzle, Zod. API process `:4100`, separate worker process.
- Client: Vite dev server `:5173`, proxies `/api` and `/health` to `http://localhost:4100`. Same-origin cookies.
- Database: local Postgres at `localhost:5432`, database `music_studio` (test DB `music_studio_test`).
- Provider mode: `NOIZ_MODE=mock | live` (default `mock`). Mock mode never calls Noiz; it simulates two variants and uses `music/audio.mp3` (repo root) as output audio. Live mode requires `NOIZ_API_KEY` in `backend/.env` (never read `keys.md`, never commit keys). `GET /connection` reports the mode so the UI can badge "Mock provider".

## Conventions

- Base path `/api/v1`. JSON, camelCase. IDs are UUID strings. Timestamps ISO-8601 strings. Credits are integers.
- Success: `{ "data": T }`, lists: `{ "data": T[], "nextCursor": string | null }`.
- Error: `{ "error": { "code": string, "message": string, "requestId": string, "retryable": boolean, "fields"?: Record<string, string> } }`.
- Every response has header `X-Request-Id`.
- Auth: single owner. Session cookie `ms_sid` (httpOnly, SameSite=Lax, Secure in prod). All routes except `GET/POST /session`, `/health/*` return `401 UNAUTHENTICATED` without a session.
- CSRF: every non-GET request must send header `X-CSRF-Token` equal to `csrfToken` from `GET /session`. Missing/wrong → `403 CSRF_INVALID`.
- Error codes: `VALIDATION_FAILED` (400), `UNAUTHENTICATED` (401), `CSRF_INVALID` (403), `NOT_FOUND` (404), `CONFLICT` (409), `INSUFFICIENT_BUDGET` (409), `CAPABILITY_UNAVAILABLE` (409), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `PROVIDER_UNAVAILABLE` (502), `INTERNAL` (500).

## Types

```ts
type JobKind = 'music'
type JobStatus =
  | 'queued' | 'submitting' | 'submitted' | 'running'
  | 'partially_succeeded' | 'succeeded' | 'failed'
  | 'submission_unknown' | 'reconciliation_required' | 'cancelled_before_submission'
type VariantStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'unknown'
type ErrorClass =
  | 'invalid_credentials' | 'insufficient_funds' | 'rate_limited' | 'invalid_input'
  | 'provider_unavailable' | 'result_expired' | 'ambiguous_submission'
  | 'polling_failed' | 'generation_failed' | 'storage_failed'

interface MusicInput {
  prompt: string                 // required, 1..2000 chars (song description)
  lyricsMode: 'lyrics' | 'generate'
  lyrics?: string                // required when lyricsMode='lyrics', 1..5000 chars
  lyricsPrompt?: string          // required when lyricsMode='generate', 1..1000 chars
  title?: string                 // <=120
  tags?: string[]                // style tags, <=10 items, each <=40
  negativeTags?: string[]        // <=10 items, each <=40
  vocalGender?: 'male' | 'female' | null
}

interface Estimate {
  kind: JobKind
  credits: number                // preflight reservation, e.g. 2700
  assumption: string             // e.g. "Assumes 180 s longest variant × 15 credits/s; final charge depends on actual duration"
  pricingVersion: string         // e.g. "noiz-music-2026-09-30"
  verified: boolean              // whether pricing is verified for this account
  availableCredits: number       // locally estimated spendable budget after pending reservations
  expiresAt: string
}

interface Variant {
  id: string
  index: 0 | 1                   // shown as "Variant A" / "Variant B"
  providerProductId: string | null
  status: VariantStatus
  rawStatus: string | null
  durationSeconds: number | null
  progress: number | null        // only when provider reports it; never invented
  assetId: string | null
  errorMessage: string | null
}

interface Job {
  id: string
  kind: JobKind
  status: JobStatus
  input: MusicInput
  projectId: string | null
  estimateCredits: number
  chargedCredits: number | null  // null until settled
  pricingVersion: string
  providerTaskId: string | null
  errorClass: ErrorClass | null
  errorMessage: string | null    // safe, user-facing
  attempts: number
  variants: Variant[]
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  completedAt: string | null
}

interface Asset {
  id: string
  kind: 'audio'
  title: string
  jobId: string | null
  variantId: string | null
  variantIndex: 0 | 1 | null
  siblingAssetId: string | null  // other variant of the same pair
  projectId: string | null
  projectName: string | null
  mimeType: string               // real stored type, e.g. audio/mpeg
  bytes: number
  durationSeconds: number | null
  favorite: boolean
  archived: boolean
  lyrics: string | null
  prompt: string | null
  tags: string[]
  createdAt: string
  contentUrl: string             // /api/v1/assets/:id/content (Range supported)
  downloadUrl: string            // /api/v1/assets/:id/download (attachment)
}

interface Project { id: string; name: string; description: string | null; archived: boolean; assetCount: number; createdAt: string; updatedAt: string }

interface LedgerEntry {
  id: string
  jobId: string | null
  kind: 'allocation' | 'reservation' | 'reservation_release' | 'charge' | 'adjustment'
  credits: number                // signed: allocations/adjustments +/-, reservations negative, charges negative
  usdEstimate: string | null     // decimal string
  source: 'owner' | 'app' | 'provider' | 'reconciliation'
  pricingVersion: string | null
  note: string | null
  createdAt: string
}

interface Usage {
  startingAllocation: number     // owner-reported, default 100000
  reserveCredits: number         // unallocated reserve, default 10000
  envelopes: { key: 'music' | 'supporting' | 'validation'; label: string; allocated: number; confirmedCredits: number; pendingCredits: number }[]
  adjustmentsCredits: number
  confirmedCredits: number       // settled charges (positive number = spent)
  pendingCredits: number         // open reservations
  estimatedRemaining: number     // allocation + adjustments - reserve - confirmed - pending
  lastReconciledAt: string | null
  providerBalance: null          // no verified balance source; UI must never label estimate as live balance
  warnings: ('low_budget' | 'unverified_pricing' | 'stale_reconciliation' | 'pending_reconciliation')[]
  byDay: { date: string; credits: number }[]  // last 30 days confirmed charges
}

interface Capability {
  key: 'music' | 'cover' | 'sound' | 'speech' | 'voices' | 'transcribe' | 'media' | 'workflows'
  label: string
  release: 'R1' | 'R2' | 'R3' | 'R4'
  available: boolean
  reason: string | null          // why unavailable
  limits?: Record<string, unknown>
}
```

## Endpoints

| Method & path | Body / query | Response |
| --- | --- | --- |
| `GET /health/live` | – | `{ status: 'ok' }` |
| `GET /health/ready` | – | `{ status: 'ok' \| 'degraded', db: boolean }` |
| `GET /api/v1/session` | – | `{ data: { authenticated: boolean, owner: { name: string } \| null, csrfToken: string } }` |
| `POST /api/v1/session` | `{ password }` | `{ data: { authenticated: true, owner, csrfToken } }`; 401 `INVALID_CREDENTIALS` on bad password; rate-limited |
| `DELETE /api/v1/session` | – | `{ data: { authenticated: false } }` |
| `GET /api/v1/capabilities` | – | `{ data: Capability[] }` |
| `GET /api/v1/connection` | – | `{ data: { mode: 'mock' \| 'live', status: 'configured' \| 'missing' \| 'unavailable', checkedAt } }` — never returns the key |
| `POST /api/v1/estimates` | `{ kind: 'music', input: MusicInput }` | `{ data: Estimate }` |
| `POST /api/v1/jobs` | `{ kind: 'music', idempotencyKey: string (uuid), input: MusicInput, projectId?: string }` | `202 { data: Job }`. Same key+owner returns the existing job (200). Reserves budget transactionally; `409 INSUFFICIENT_BUDGET`; `409 CONFLICT` if a paid job is already in flight (concurrency 1) |
| `GET /api/v1/jobs` | `?status=&kind=&cursor=&limit=` (limit ≤50, default 20, newest first) | list of `Job` |
| `GET /api/v1/jobs/:id` | – | `{ data: Job }` |
| `POST /api/v1/jobs/:id/cancel` | – | `{ data: Job }` if `queued`; else `409 CONFLICT` |
| `GET /api/v1/assets` | `?q=&favorite=true&projectId=&archived=false&sort=createdAt\|title\|duration&order=asc\|desc&cursor=&limit=` | list of `Asset` |
| `GET /api/v1/assets/:id` | – | `{ data: Asset }` |
| `PATCH /api/v1/assets/:id` | `{ title?, favorite?, archived?, projectId?: string \| null }` | `{ data: Asset }` |
| `GET /api/v1/assets/:id/content` | `Range` header | audio bytes, `206` for ranges, `Accept-Ranges: bytes` |
| `GET /api/v1/assets/:id/download` | – | attachment, real extension from stored MIME |
| `GET /api/v1/projects` | `?archived=false` | list of `Project` |
| `POST /api/v1/projects` | `{ name, description? }` | `201 { data: Project }` |
| `GET /api/v1/projects/:id` | – | `{ data: Project & { assets: Asset[] } }` |
| `PATCH /api/v1/projects/:id` | `{ name?, description?, archived? }` | `{ data: Project }` |
| `GET /api/v1/usage` | – | `{ data: Usage }` |
| `GET /api/v1/usage/ledger` | `?cursor=&limit=` | list of `LedgerEntry` |
| `POST /api/v1/usage/reconciliations` | `{ credits: number (signed int), reason: string, source: string }` | `201 { data: LedgerEntry }` — local record only, no money movement |
| `GET /api/v1/budget` | – | `{ data: { startingAllocation, reserveCredits, envelopes: {key,label,allocated}[], maxConcurrentPaidJobs: 1 } }` |
| `PATCH /api/v1/budget` | same fields, partial | `{ data: ... }` |

## Client polling

- Poll `GET /jobs/:id` every 3 s while status is non-terminal (`queued|submitting|submitted|running`); stop on terminal states. Terminal: `partially_succeeded|succeeded|failed|submission_unknown|reconciliation_required|cancelled_before_submission`.
- Mock provider completes a job in roughly 15–25 s with variant durations near the sample file length.

---

# R2 — Audio Studio (added 2026-09-30)

Provider evidence: [NOIZ_R2_CONTRACTS.md](NOIZ_R2_CONTRACTS.md). R1 shapes above stay valid; R2 extends them. Media (R3) and Workflows (R4) remain `available: false`.

## Billing groups and policy

| Kind | Provider call | Billing | Estimate rule |
| --- | --- | --- | --- |
| `music` | text-to-music (R1) | credits | 2700 preflight; settle ceil(longest s) × 15 |
| `cover` | text-to-music/cover + poll task | credits | 2700 preflight; settle ceil(longest s) × 15; either variant fails → 0 |
| `lyrics_recognition` | cover/recognize-lyrics (sync, send `idempotency_key` = job id) | credits | 100 preflight; charge 100 only if provider reports `charged`/`credit_charged` true, else 0 |
| `sound` | text-to-sound (sync) | usd | $0.001 × duration s |
| `speech` | text-to-speech (sync; `stream=true` when text > 5000 chars) | usd | $15 / 1M chars → chars × 0.000015 |
| `emotion_enhance` | emotion-enhance (sync JSON) | usd | price not documented → `usd: null`, `verified: false` |
| `voice_design` | voice-design (sync) | usd | $0.30 per generation |
| `voice_clone` | POST /voices (sync) | usd | price not documented → `usd: null` |
| `transcription` | speech-to-text (sync) | usd | $0.0006 × upload duration s |

- Credit kinds reserve from the `music` envelope and follow R1 ledger rules.
- USD kinds are **PAYGO cash**. Budget gains `usdMonthlyCap: string` (decimal, default `"0.00"`). When the cap is `0`, every USD kind returns `409 CAPABILITY_UNAVAILABLE` with reason "Set a USD pay-as-you-go cap in Settings". USD estimates are reserved against `cap − confirmed USD this calendar month − pending USD`; `409 INSUFFICIENT_BUDGET` when exceeded. Unknown-price kinds reserve `0`, settle with `usd: null`, and add a `pending_reconciliation` usage warning.
- Enforced in both mock and live mode (mock just never calls Noiz).
- Concurrency: at most 1 in-flight job **per billing group** (`credits`, `usd`). Second in the same group → `409 CONFLICT`.
- All USD math uses decimal strings (no floats in the DB — `numeric(12,6)`).

## Type changes

```ts
type JobKind = 'music' | 'cover' | 'lyrics_recognition' | 'sound' | 'speech'
  | 'emotion_enhance' | 'voice_design' | 'voice_clone' | 'transcription'
type BillingGroup = 'credits' | 'usd'

interface Estimate {                 // replaces R1 Estimate (superset)
  kind: JobKind
  billing: BillingGroup
  credits: number | null             // credits kinds
  usd: string | null                 // usd kinds; null when price undocumented
  assumption: string
  pricingVersion: string
  verified: boolean
  availableCredits: number
  availableUsd: string               // cap − month confirmed − pending
  expiresAt: string
}

interface Job {                      // R1 fields plus:
  billing: BillingGroup
  input: MusicInput | CoverInput | LyricsRecognitionInput | SoundInput | SpeechInput
       | EmotionInput | VoiceDesignInput | VoiceCloneInput | TranscriptionInput
  estimateUsd: string | null
  chargedUsd: string | null
  result: JobResult | null           // text/structured outputs; audio outputs stay in variants[]
}
// variants[]: music & cover → 2; sound & speech → 1; voice_design → one per preview; others → []

type JobResult =
  | { kind: 'lyrics_recognition'; hasVocals: boolean; lyrics: string }
  | { kind: 'emotion_enhance'; text: string }
  | { kind: 'transcription'; language: string; transcript: string; durationSeconds: number;
      segments: { text: string; start: number; end: number; speaker: number | null }[] }
  | { kind: 'voice_design'; voiceIds: string[]; features: Record<string, string> | null }
  | { kind: 'voice_clone'; voiceId: string }

interface CoverInput {
  uploadId: string                   // purpose 'cover_source'
  lyrics: string                     // required 1..5000
  melodyAdherence: 'high' | 'main_melody'
  musicDescription?: string          // one of musicDescription/style required, <=2000
  style?: string                     // <=200
  title?: string                     // <=120
  vocalGender?: 'male' | 'female' | null   // adapter maps to 'Male'/'Female'
  rightsConfirmed: true              // owner confirms permission to use the source
}
interface LyricsRecognitionInput { uploadId: string }        // purpose 'cover_source'
interface SoundInput { prompt: string /*1..500*/; durationSeconds: number /*int 1..30, default 10*/; format: 'wav' | 'mp3' }
interface SpeechInput {
  text: string                       // 1..50000; >5000 uses provider streaming
  voiceId: string                    // local Voice.id
  format: 'wav' | 'mp3'              // mp3 only allowed when text <= 5000 (stream is WAV)
  speed?: number                     // 0.5..2.0, default 1
  targetLang?: string                // <=10, e.g. 'en', 'zh+en'
  trimSilence?: boolean
}
interface EmotionInput { text: string /*1..5000*/ }
interface VoiceDesignInput {
  voiceDescription: string           // 20..1000
  guidanceScale?: number             // 0..100, default 5
  loudness?: number                  // -1..1, default 0.5
  name?: string                      // local display name for resulting voices
}
interface VoiceCloneInput {
  uploadId: string                   // purpose 'voice_sample'
  name: string                       // 1..80
  language?: string                  // e.g. 'en'
  denoise?: boolean
  permissionConfirmed: true          // owner confirms rights to the voice
}
interface TranscriptionInput { uploadId: string /* purpose 'transcription' */; language?: string }

interface Asset {                    // R1 fields plus:
  kind: 'audio'
  source: 'music' | 'cover' | 'sound' | 'speech' | 'voice_preview'
  mimeType: string                   // real, detected from bytes: audio/mpeg or audio/wav
}

interface Upload {
  id: string
  purpose: 'cover_source' | 'voice_sample' | 'transcription'
  filename: string                   // sanitized display name only
  mimeType: string                   // detected from magic bytes, not client header
  bytes: number
  durationSeconds: number | null     // ffprobe
  expiresAt: string                  // 24 h unless consumed by a job
  createdAt: string
}

interface Voice {
  id: string                         // local UUID (built-in voices also get stable local rows)
  providerVoiceId: string
  name: string
  type: 'built-in' | 'custom' | 'designed'
  labels: string | null
  language: string | null
  previewUrl: string | null          // /api/v1/voices/:id/preview (server-cached copy), never a provider URL
  permissionConfirmedAt: string | null
  deletionStatus: 'active' | 'deleting' | 'deleted' | 'delete_failed'
  createdAt: string
}

interface Budget { /* R1 fields plus */ usdMonthlyCap: string }
interface Usage {  /* R1 fields plus */
  usd: { monthlyCap: string; confirmedThisMonth: string; pending: string; available: string }
}
// Usage.warnings adds 'usd_cap_unset'
// LedgerEntry: credits may be 0 for usd entries; usdEstimate carries the amount; new field currency: 'credits' | 'usd'
```

Upload limits (validated server-side by magic bytes + ffprobe):

| Purpose | Types | Max size | Max duration |
| --- | --- | --- | --- |
| `cover_source` | mp3, wav, flac, m4a, aac, ogg | 100 MB | – |
| `voice_sample` | wav, mp3, m4a | 20 MB | 60 s |
| `transcription` | mp3, wav, m4a, ogg, flac, aac, webm | 50 MB | 600 s |

## New / changed endpoints

| Method & path | Body / query | Response |
| --- | --- | --- |
| `POST /api/v1/uploads` | `multipart/form-data`: `file`, `purpose` | `201 { data: Upload }`; `413 PAYLOAD_TOO_LARGE`; `400 VALIDATION_FAILED` (`fields.file`) for bad type/duration |
| `GET /api/v1/uploads/:id` | – | `{ data: Upload }` |
| `POST /api/v1/estimates` | `{ kind, input }` any JobKind | `{ data: Estimate }` |
| `POST /api/v1/jobs` | `{ kind, idempotencyKey, input, projectId? }` any JobKind | `202 { data: Job }` (R1 rules apply) |
| `GET /api/v1/jobs` | adds `?kind=` any JobKind | list |
| `GET /api/v1/jobs/:id/transcript` | `?format=txt\|srt\|json` | attachment; `409 CONFLICT` if not a succeeded transcription |
| `GET /api/v1/assets` | adds `?source=` | list |
| `GET /api/v1/voices` | `?type=built-in\|custom\|designed&q=` | list of `Voice` (built-in synced from provider, cached ≤ 24 h; mock returns a fixed set of 6) |
| `GET /api/v1/voices/:id` | – | `{ data: Voice }` |
| `GET /api/v1/voices/:id/preview` | `Range` | audio bytes; `404` if no preview |
| `PATCH /api/v1/voices/:id` | `{ name }` (custom/designed only) | `{ data: Voice }` |
| `DELETE /api/v1/voices/:id` | body `{ confirm: true }` (custom/designed only) | `{ data: Voice }` with `deletionStatus`; provider soft-delete; `409` for built-in |
| `GET /api/v1/sound/provider-history` | `?skip=&limit=` | `{ data: { genProductId, prompt, durationSeconds, createdAt }[] }` (live only; mock returns []) |
| `DELETE /api/v1/sound/provider-history/:genProductId` | `{ confirm: true }` | `{ data: { genProductId } }` — removes provider record only, never local assets |
| `GET/PATCH /api/v1/budget` | adds `usdMonthlyCap` | – |

Capabilities: `cover`, `sound`, `speech`, `voices`, `transcribe` report `available: true` unless blocked (USD kinds with cap 0 → `available: false`, reason as above; `limits` carries the table values). `media`, `workflows` stay unavailable.

Mock provider (default): covers behave like music (~15–25 s, two variants from `music/audio.mp3`); recognition returns fixed sample lyrics with `hasVocals: true`; sound/speech return a generated WAV of the requested length (sine/noise via ffmpeg or a pure-JS WAV writer); emotion returns the text prefixed with `[Happy#Joy:0.6]:`; voice design returns 2 previews; clone returns a new voice id; transcription returns a transcript with 2–3 segments sized to the upload duration. Sync kinds finish in 2–5 s.

Live adapter notes: every JSON endpoint checks body `code` (0 success; sound-history 200). Binary endpoints (`/text-to-speech`, `/text-to-sound`) succeed only on `audio/*` content type; read `X-Audio-Duration`. For `/text-to-sound`, if a JSON body with `data.results[].file_url` arrives instead, follow it with the safe-fetch downloader (https only, public hosts, size/time limits) and log a `provider_contract_drift` warning. Never send formats other than wav/mp3.
