# Music Studio — Backend (R1)

Express 5 + TypeScript API and worker for the Music Studio R1 music core, backed by PostgreSQL + Drizzle. Implements [`API_CONTRACT.md`](../API_CONTRACT.md) (base path `/api/v1`).

## Stack

- Express 5, TypeScript (strict, no `any`)
- PostgreSQL + Drizzle ORM (`postgres` / postgres.js driver), migrations via `drizzle-kit`
- Zod validation at every request boundary
- `express-session` with a Drizzle-backed Postgres session store (cookie `ms_sid`)
- `argon2` for the owner password hash
- `pino` structured logging with redaction (no lyrics/prompts/secrets in logs)
- Vitest + Supertest for integration tests

## Layout

```
src/
  app.ts, server.ts        # API process (port 4100)
  worker.ts                # worker process (durable job polling)
  config/env.ts            # Zod-validated environment
  db/                      # Drizzle schema + client + migration runner
  libs/                    # Errors, enums, types, mappers, utils
  middlewares/              # auth, csrf, session, rate limit, error handler
  validators/               # Zod request schemas
  repositories/              # Drizzle queries, one per domain
  services/                  # business logic (jobs, assets, usage, provider adapters, storage)
  controllers/ + routes/     # thin HTTP layer
  worker/                    # jobProcessor (submit/poll/settle) + runner (claim loop, backoff)
  scripts/                   # hash-password, seed
drizzle/                    # generated SQL migrations (committed)
storage/                    # local object storage (gitignored)
tests/                      # vitest + supertest integration tests
```

## Setup

Prerequisites: Node ≥ 20, npm, PostgreSQL running locally (`psql` reachable at `localhost:5432`).

```bash
npm install

# create the databases (once)
psql -h localhost -p 5432 -d postgres -c "CREATE DATABASE music_studio;"
psql -h localhost -p 5432 -d postgres -c "CREATE DATABASE music_studio_test;"

cp .env.example .env
# generate a session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# generate the owner password hash (dev password below)
npm run hash-password -- "studio-dev"
# paste both into .env: SESSION_SECRET=..., OWNER_PASSWORD_HASH=...

npm run db:migrate                                            # migrate music_studio
DATABASE_URL=postgres://localhost:5432/music_studio_test \
  npx tsx src/db/migrate.ts                                   # migrate music_studio_test (used by tests)
npm run db:seed                                                # seeds budget config + allocation ledger entry
```

**Local dev login password:** `studio-dev` (the `.env` in this checkout already has its argon2 hash in `OWNER_PASSWORD_HASH`).

## Running

```bash
npm run dev:api      # API on :4100
npm run dev:worker   # worker (durable job processing)
npm run dev          # both, via concurrently
```

`NOIZ_MODE` defaults to `mock`: no real Noiz calls are made. The mock provider simulates two variants completing over roughly 15–25 seconds and uses `../music/audio.mp3` (repo root) as the result audio, copied into `storage/` under a random key — exactly like a real provider download. Mock charge = `ceil(longer variant duration in seconds) × 15` credits.

To use the (unverified) live adapter instead, set `NOIZ_MODE=live` and `NOIZ_API_KEY=...`. This is built strictly from the documented Noiz contract and has never been exercised against the real API — only via unit tests with a mocked `fetch` (see `tests/provider.live.test.ts`).

## Testing

```bash
npm run typecheck   # tsc --noEmit (src + tests)
npm run lint         # eslint
npm test             # vitest run, against music_studio_test
```

Tests run fully sequentially (`fileParallelism: false` in `vitest.config.ts`) because they share one Postgres database and truncate it between tests — do not remove that setting without giving each test file its own database.

Worker-path tests (submission timeouts, business errors, partial/full failure, double-settlement) call `processJobTick` directly against a scripted `FakeProvider` test double, so they run instantly instead of waiting on real timers; `LiveNoizProvider` is tested separately with a mocked `global.fetch`.

## Smoke test (manual)

```bash
npm run dev:api &
npm run dev:worker &

# 1) anonymous session + CSRF token
curl -sS -c c.txt -b c.txt http://localhost:4100/api/v1/session

# 2) login (use the csrfToken from step 1)
curl -sS -c c.txt -b c.txt -X POST http://localhost:4100/api/v1/session \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" \
  -d '{"password":"studio-dev"}'

# 3) create a mock music job (use the NEW csrfToken from step 2's response)
curl -sS -c c.txt -b c.txt -X POST http://localhost:4100/api/v1/jobs \
  -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" \
  -d '{"kind":"music","idempotencyKey":"<uuid>","input":{"prompt":"...","lyricsMode":"generate","lyricsPrompt":"..."}}'

# 4) poll GET /api/v1/jobs/:id every ~3s until status is terminal

# 5) once succeeded, fetch a Range request on the asset
curl -i -c c.txt -b c.txt -H "Range: bytes=0-99" http://localhost:4100/api/v1/assets/<assetId>/content

# 6) confirm the settled charge
curl -sS -c c.txt -b c.txt http://localhost:4100/api/v1/usage
```

## Environment variables

See `.env.example`. Notable ones:

- `DATABASE_URL` / `TEST_DATABASE_URL` — Postgres connection strings (test DB is used automatically when `NODE_ENV=test`, which Vitest sets by default).
- `SESSION_SECRET`, `OWNER_PASSWORD_HASH`, `OWNER_NAME` — owner auth.
- `COOKIE_SECURE` — set `true` in production (HTTPS).
- `NOIZ_MODE`, `NOIZ_BASE_URL`, `NOIZ_API_KEY` — provider selection; key is never logged or returned by any endpoint.
- `STORAGE_DIR` — local object storage root (relative to the process cwd).
- `MOCK_AUDIO_SOURCE_PATH` — file the mock provider "downloads" as the result (defaults to the repo's `music/audio.mp3`).
- `WORKER_POLL_INTERVAL_MS`, `WORKER_LEASE_MS`, `WORKER_MAX_ATTEMPTS` — worker tuning.

## Notes on the design

- **Idempotency & concurrency:** job creation is serialized through a single Postgres advisory lock (`pg_advisory_xact_lock`) covering the in-flight check, the budget check, and the insert, so concurrent `POST /jobs` calls can never oversubscribe the budget or exceed the concurrency-1 limit.
- **Outbox:** a `job_outbox` row is inserted in the same transaction as the job/variants/reservation, so an accepted job can never be dropped before the worker sees it.
- **Worker:** claims due `job_outbox` rows with `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED)`, so multiple worker processes could run safely (only one is started by `npm run dev:worker`). Leases + heartbeats let a crashed worker's claim be reclaimed after `WORKER_LEASE_MS`.
- **Submission timeout → `submission_unknown`:** the job is marked `submitting` (durable) *before* the network call; a timeout or crash in that window is treated as ambiguous and the job becomes `submission_unknown` with its reservation intact — never auto-retried.
- **Settlement:** exactly once per job via a unique `settlement_key` on the charge ledger entry (`ON CONFLICT DO NOTHING`), so repeated poll ticks can never double-charge.
