# NOIZ R2 Audio Studio — API Contracts

Date evidence gathered: 2026-09-30
Method: `developers.noiz.ai` is a JavaScript-rendered SPA — direct `WebFetch` on its doc routes returned HTTP 404 (no server-rendered HTML), so all primary evidence below was read with the **ego-browser** skill (real browser render, read-only). No sign-in was performed. No request was sent to `https://noiz.ai/v1` (no paid or authenticated calls). `keys.md` was not read. Secondary evidence was pulled read-only from the public GitHub repo `NoizAI/skills` via `gh api` (no auth, no clone) and is marked **SECONDARY** — it reflects one client's implementation, not the API reference, and is used only to corroborate or flag gaps.

Primary source pages (all under `developers.noiz.ai`, checked 2026-09-30):
- `/api-docs` — overview, auth, rate limits, pricing table
- `/docs-voices` — Voices resource
- `/docs-text-to-speech` — Text to Speech, deprecated long-form, Emotion Enhancement
- `/docs-guest` — Guest TTS (no key)
- `/docs-voice-design` — Voice Design
- `/docs-speech-to-text` — Speech to Text
- `/docs-text-to-music` — Text to Music, Cover, Recognize Lyrics
- `/docs-text-to-sound` — Text to Sound, history, delete

Business-code convention observed across all pages: success is `"code": 0` for Voices, Text-to-Speech (JSON variants: deprecated long-form + Emotion Enhancement), Voice Design, Speech-to-Text, Text-to-Music, and Cover. The `text-to-sound-history` GET/DELETE endpoints use `"code": 200` on success instead — this exactly matches the existing PRD note ("music/media use 0, sound history uses 200"). The synchronous binary endpoints (`POST /text-to-speech` non-JSON success, `POST /guest/text-to-speech`, `POST /text-to-sound`) return **raw audio bytes** on success — there is no JSON envelope/business code at all in that case; errors from those same endpoints are `application/json`.

---

## 0. Global contract

Source: `https://developers.noiz.ai/api-docs`, 2026-09-30

- Base URL: `https://noiz.ai/v1`
- Auth: all endpoints except Guest TTS require header `Authorization: YOUR_API_KEY` (raw key value — no `Bearer` prefix shown or implied anywhere in the docs).
- `voice_id`: obtained via `GET /voices` or created via `POST /voices`.
- Default Guest TTS voices (partial list on the overview page): English `95814add`, Chinese `3b9f1e27`, Japanese `063a4491` (full 15-voice whitelist is under Guest, section 6 below).
- Rate limits (stated globally, not endpoint-specific unless noted per-endpoint below):
  - "Authenticated endpoints are subject to a monthly usage quota per API key. Exceeding your quota returns a credit limit error." — **the numeric quota is never stated anywhere in the docs.** INFERRED/GAP: cannot be reproduced or displayed proactively; only reactive `429` handling is possible.
  - Guest TTS: 5 requests per IP per month.
  - Over-limit requests return `429 Too Many Requests`.
- Pricing table (verbatim columns `FEATURE / PRICE / NOTES`):

  | FEATURE | PRICE | NOTES |
  | --- | --- | --- |
  | Text to Speech | $15 / 1M chars | Pay-as-you-go, billed monthly |
  | Voice Design | $0.30 / generation | Per generation (`POST /voice-design`) |
  | Speech to Text | $0.0006 / sec | Per second of audio (`POST /speech-to-text`) |
  | Free Tier | 10,000 chars | For new API users, no credit card required |

  This table does not price Text-to-Music/Cover (credit-based, priced on the endpoint pages themselves — see section 7) or Text-to-Sound (priced on its own endpoint page — see section 8). No credit-vs-USD conversion for the free tier or the TTS/STT/Voice-Design PAYGO rates was documented; those are dollar rates only, separate from the credit ledger used by Text-to-Music.

---

## 1. Voices

Source: `https://developers.noiz.ai/docs-voices`, 2026-09-30

### 1.1 `GET /voices` — Get user voices or system voices

- Content type: none (query params only)
- Query parameters:
  - `voice_type` — string, enum, optional. "`custom` for user-created voices (default), `built-in` for system voices." Default: `custom`. Possible values: `custom`, `built-in`.
  - `keyword` — string, optional. "Search keyword (searches voice name, description, labels)."
  - `skip` — integer, optional. "Page number (starts from 0)." Default: `0`.
  - `limit` — integer, optional. "Maximum number of items to return per page." Default: `10`.
- Responses: `200 application/json` Success; `400 application/json` Invalid parameters; `401 application/json` API Key missing or invalid.
- Success body (`200`):
  ```json
  {"code":0,"message":"string","data":{"total_count":0,"voices":[{"id":0,"voice_id":"string","display_name":"string","voice_type":"string","labels":"string","sample":"string","meta":{"text":"string"},"url":"string","create_time":0}]}}
  ```

### 1.2 `POST /voices` — Clone a voice

- Content type: `multipart/form-data`
- "Clone a voice by uploading an audio file or providing an audio URL. Provide either `file` (upload) or `voice_url` (remote URL), at least one is required. Only WAV, MP3, and M4A formats are supported."
- Fields:
  - `file` — string · binary, optional. "Audio file to upload (WAV, MP3, or M4A). Either `file` or `voice_url` must be provided."
  - `voice_url` — string, optional. "URL to a remote audio file (WAV, MP3, or M4A). Either `file` or `voice_url` must be provided."
  - `display_name` — string, optional. "Display name for the cloned voice."
  - `denoise` — boolean, optional. "Whether to apply noise reduction to the audio."
  - `language` — string, optional. "Language of the audio (e.g. \"en\", \"zh\")."
- Responses: `200 application/json` Success; `400 application/json` Invalid request / processing error; `401 application/json` API Key missing or invalid.
- Success body:
  ```json
  {"code":0,"message":"string","data":{"voice_id":"string","voice_display_name":"string","duration":0,"selected_text":"string","selected_start":0,"selected_end":0,"text":"string","language":"string"}}
  ```

### 1.3 `GET /voices/{voice_id}` — Get voice details

- Path param: `voice_id` — string, required.
- Responses: `200 application/json` Success; `400` Invalid parameters; `404 application/json` Voice not found; `401 application/json` API Key missing or invalid.
- Success body: same shape as one item of `1.1`'s `voices[]` array (`id, voice_id, display_name, voice_type, labels, sample, meta{text}, url, create_time`), wrapped as `{"code":0,"message":"string","data":{...}}`.

### 1.4 `DELETE /voices/{voice_id}` — Delete a voice (soft delete)

- "Soft delete a voice by setting `delete_time`. The voice won't be physically removed from storage."
- Path param: `voice_id` — string, required. "The ID of the voice to delete."
- Responses: `200 application/json` Success; `401 application/json` API Key missing or invalid; `404 application/json` Voice not found.
- Success body (worked example, real-looking values):
  ```json
  {"code":0,"message":"success","data":{"voice_id":"abc123def456","display_name":"My Custom Voice","delete_time":1738664823}}
  ```

No rate limit or credit price is stated on any Voices endpoint page itself (only the global monthly-quota/429 statement in section 0 applies). No idempotency support documented for `POST /voices`.

---

## 2. Text to Speech (current, non-deprecated)

Source: `https://developers.noiz.ai/docs-text-to-speech`, 2026-09-30

### 2.1 `POST /text-to-speech` — Convert text to speech

- Content type: `multipart/form-data`
- "Convert text to speech using a specified voice. Supports emotion control, speed adjustment, and multiple output formats."
- Fields:
  - `text` — string, **required**. "Text to convert. Max 5000 chars for non-streaming (`stream=false`); max 50000 chars for streaming (`stream=true`)."
  - `voice_id` — string, optional. "Voice ID to use for synthesis."
  - `file` — string · binary, optional. "Audio file for voice cloning (alternative to `voice_id`)."
  - `quality_preset` — integer, optional. Default: `3`.
  - `output_format` — string · enum, optional. "Output audio format (wav/mp3)." Default: `wav`. Possible values: `wav`, `mp3`.
  - `speed` — number, optional. Default: `1`.
  - `duration` — number, optional. "Target audio duration in seconds." Default: `0`. (No documented min/max range on this page.)
  - `target_lang` — string, optional. "Target language code (e.g., \"zh\", \"en\", \"zh+en\")."
  - `similarity_enh` — boolean, optional. "Whether to enhance voice similarity." Default: `false`.
  - `emo` — string, optional. "Emotion parameters as JSON string, e.g., `{\"Sadness\":0.2, \"Surprise\":0.5}`."
  - `trim_silence` — boolean, optional. Default: `false`.
  - `save_voice` — boolean, optional. "Whether to save the uploaded voice file." Default: `false`.
  - `stream` — boolean, optional. Default: `false`. Full text: **"Whether to return audio as a real-time chunked stream. When false (default): waits for full synthesis and returns the complete audio file; supports all output formats; max 5000 chars. When true: returns a chunked WAV stream for low-latency playback; billing is charged at connection establishment; max 50000 chars."**
- Responses:
  - `200 audio/wav` — "Success — returns audio binary. When `stream=false`: complete audio file (wav or mp3). When `stream=true`: chunked WAV stream (`Transfer-Encoding: chunked`)." Response is documented as "Audio Binary Stream... raw audio bytes (`audio/wav` or `audio/mpeg`). Pipe the response directly to a file or audio player — do not parse as JSON." Headers: `X-Timestamp` (generation time, ms), `X-Audio-Duration` (duration, s).
  - `400 application/json` Invalid parameters or processing error.
  - `401 application/json` API Key missing or invalid.
  - `402 application/json` Payment required.
  - `500 application/json` Internal server error (TTS synthesis failure).
- **This is the current/only supported long-form approach**: set `stream=true` to go past the 5,000-char sync cap, up to 50,000 chars, with billing charged at connection establishment (i.e. before the full stream completes — a partial/failed stream may still be billed; not stated either way, so treat as billed-on-open for ledger purposes).
- No numeric rate limit stated on this endpoint's own page (only the global monthly-quota + 429 statement applies).

### 2.2 `POST /text-to-speech-large` — DEPRECATED

- Doc heading verbatim: **"Long-form text to speech (deprecated — use /text-to-speech with stream=true instead)"**.
- Doc body verbatim: "**Deprecated.** Use `POST /text-to-speech` with `stream=true` instead, which supports up to 50,000 characters with real-time chunked streaming. This endpoint is no longer maintained."
- Content type: `multipart/form-data`. Fields: `text` (required, max 20,000 chars), `voice_id` (required), `output_format` (enum `wav`/`mp3`, default `wav`), `speed` (default `1`, doc text says "0.5–2.0" range), `target_lang` (optional), `quality_preset` (default `3`), `trim_silence` (default `false`).
- Responses: `200 application/json` Job submitted — returns `gen_product_id` for polling; `400`, `401`, `402 application/json`.
- Success body: `{"code":0,"message":"success","data":{"gen_product_id":"191_abc123_d618db1d","status":"PENDING","sections":[{}]}}`
- Companion poll: `GET /text-to-speech-large/gen_products/{gen_product_id}` — also marked deprecated ("Companion poll endpoint for the deprecated `POST /text-to-speech-large`. Use `POST /text-to-speech` with `stream=true` instead."). Path param `gen_product_id` required. Responses `200`, `401`, `404 application/json` (Job not found).
- Poll success body:
  ```json
  {"code":0,"message":"success","data":{"gen_product_id":"string","status":"COMPLETED","url":"https://storage.googleapis.com/...","file_path":"string","duration":92892,"target_text":"string","sections":[{"section_id":"string","section_text":"string","voice_id":"string","url":"string","duration":0,"section_status":"string"}],"message":"string"}}
  ```
  Note status casing: `PENDING` / `COMPLETED` (uppercase) here, vs. lowercase `submitted` / `succeeded` used by Text-to-Music jobs (section 7) — an internal inconsistency across NOIZ endpoint families, not a documentation error on either page.
- **Do not build new R2 work on this endpoint pair.** Kept only for completeness / migration awareness.

### 2.3 `POST /emotion-enhance` — Emotion enhancement

- Content type: `application/json`
- "Automatically add emotion annotations to input text. The enhanced text can be used directly in the text-to-speech API for more expressive speech synthesis."
- Body: `text` — string, **required**. "Text to enhance with emotions (max 5000 chars)."
- Responses: `200 application/json` Success; `400` Invalid request; `401` API Key missing or invalid; `402` Payment required; `429` Hard limit exceeded.
- Success body:
  ```json
  {"code":0,"message":"success","data":{"emotion_enhance":"[Happy#Joy:0.8;Excitement:0.2]:Hello, how are you today? I'm so excited to see you!"}}
  ```
  The `emotion_enhance` string is the annotated text — feed it as `text` to `POST /text-to-speech` (the docs describe this as the intended pipeline, but do not show the `emo` field being auto-populated from it; the bracketed annotation appears to be embedded in the text itself, not a separate `emo` JSON value).
- No numeric rate limit stated beyond the `429` "Hard limit exceeded" response code (no requests/window number given, unlike Text-to-Music's explicit "5 requests / 60 seconds" phrasing).

---

## 3. Voice Design

Source: `https://developers.noiz.ai/docs-voice-design`, 2026-09-30

### `POST /voice-design` — Design a voice

- Content type: `multipart/form-data`
- "Analyze input (text description and/or image) to design a voice, returning similar voice samples or generating new ones via AI."
- Fields:
  - `picture` — string · binary, optional. "Optional image file to analyze for voice design."
  - `voice_description` — string, optional. "Description of the desired voice (20-1000 characters)." Max length: `1000`. (Docs state a 20-char floor in prose but the field metadata only shows a max-length constraint of 1000; no separate documented minimum-length validation field.)
  - `guidance_scale` — number, optional. "Guidance scale for voice generation (0-100)." Range: `0`–`100`. Default: `5`.
  - `loudness` — number, optional. "Loudness level (-1 to 1)." Range: `-1`–`1`. Default: `0.5`.
- Responses: `200 application/json` Success; `400` Invalid request; `401` API Key missing or invalid; `402` Payment required; `500` Internal server error.
- Success body:
  ```json
  {"code":0,"message":"success","data":{"previews":[{"voice_id":"abc123","audio":"UklGRiQA..."}],"text":"Hello, this is a sample of my voice.","from_cache":false,"features":{"gender":"female","age":"adult","language":"en","voice_prompt":"A warm, friendly female voice","display_name":"Friendly Female"}}}
  ```
  `previews[].audio` looks like a base64-encoded WAV (starts `UklGRiQA...`, the WAV RIFF header signature) — treat as base64 audio, not a URL.
- Price: $0.30/generation (from overview pricing table, section 0). No numeric rate limit stated on this page.

---

## 4. Speech to Text

Source: `https://developers.noiz.ai/docs-speech-to-text`, 2026-09-30

### `POST /speech-to-text` — Transcribe audio to text

- Content type: `multipart/form-data`
- Full description (untruncated): "Upload an audio file and receive a multilingual transcription. Supports mp3, wav, m4a, ogg, flac, aac, and webm formats. Maximum duration is 10 minutes (600 seconds) and maximum file size is 50MB. Billed at $0.0006/second of audio."
- Fields:
  - `file` — string · binary, **required**. "Audio file to transcribe (mp3/wav/m4a/ogg/flac/aac/webm, max 50MB, max 10 min)."
  - `language` — string, optional. "Language code (e.g. zh, en, ja, ko, fr, de, es). Leave empty for automatic language detection."
- Responses: `200 application/json` Success; `401 application/json` API Key missing or invalid. (No `400`/`413`/`415` shown for oversize/unsupported-format rejection — INFERRED gap; must be handled defensively.)
- Success body:
  ```json
  {"code":0,"message":"success","data":{"language":"zh","transcript":"你好，欢迎使用 Noiz API。","duration":3.5,"segments":[{"text":"你好，欢迎使用 Noiz API。","start":0,"end":3.5,"spk":0}]}}
  ```
  `segments[].spk` is a speaker index (speaker diarization is included in the base response, not a separate paid feature).
- Sync (no polling). Price confirmed twice (overview table + endpoint description): $0.0006/sec. No numeric rate limit stated on this page.

---

## 5. Text to Music — original songs (confirms/extends PRD §4)

Source: `https://developers.noiz.ai/docs-text-to-music`, 2026-09-30

### 5.1 `POST /text-to-music` — Submit a text-to-music generation job (async)

- Content type: `multipart/form-data`
- Full description: "Submit an async music generation job from a text prompt plus either `lyrics` or `lyrics_prompt`. Returns 2 variants — poll each `gen_product_id` with GET. Billed once per job at `ceil(longest variant seconds) × 15` credits, or $0.00015/second on PAYGO. Rate limited to 5 requests / 60 seconds."
- Fields:
  - `instrumental` — boolean, optional, default `false`. "YuE2 does not support `instrumental=true` (request is rejected). Leave false."
  - `prompt` — string, field metadata says optional, but description says "**Required.** Free-form description of the song (used as YuE2 style)" — the same optional-label-vs-required-prose inconsistency the PRD already flagged is confirmed verbatim.
  - `lyrics` — string, field metadata optional, description: "Custom lyrics to use as-is (required unless `lyrics_prompt` is set)."
  - `lyrics_prompt` — string, optional. "Prompt to auto-generate lyrics from (mutually exclusive with `lyrics`)."
  - `lyrics_file` — string · binary, optional. "Lyrics as a UTF-8 .txt file (max 64KB)."
  - `title` — string, optional. "Song title."
  - `tags` — string, optional. "Comma-separated style tags."
  - `negative_tags` — string, optional. "Comma-separated style tags to avoid."
  - `vocal_gender` — string · enum, optional. Possible values: `Male`, `Female`.
  - `mv` — string, optional. "Ignored on YuE2. Accepted for compatibility; not forwarded to the generator."
  - `auto_lyrics` — boolean, optional, default `false`. "Ignored on YuE2. Use `lyrics_prompt` to auto-write lyrics instead."
  - `target_duration` — integer · enum, optional. "Ignored on YuE2 (does not control length). If sent, must still be 60/120/180 or the request is rejected. Omit it — the pre-flight credit check then assumes 180 s (2700 credits)." Possible values: `60`, `120`, `180`.
  - `reference_audio_url` — string, optional. "Ignored on YuE2. Accepted for compatibility; not forwarded to the generator."
  - `reference_audio_file` — string · binary, optional. Same "ignored on YuE2" note.
- Responses:
  - `200 application/json` Job submitted successfully.
  - `401 application/json` API Key missing or invalid.
  - `402 application/json` "Insufficient credits and no payment method on file (or monthly hard limit reached). The pre-flight check sizes the job from `target_duration`; omitting it assumes 180 s, so the account needs 2700 credits, a payment method, or `invoice` billing."
  - `429 application/json` Rate limit exceeded (5 requests per 60 seconds).
  - `503 application/json` Music generation service temporarily unavailable.
- Success body:
  ```json
  {"code":0,"message":"success","data":{"results":[{"gen_product_id":"3f9a...tm_v1_tm","status":"submitted"},{"gen_product_id":"3f9a...tm_v2_tm","status":"submitted"}],"errors":[],"pricing":{"credits_per_second":15,"usd_per_second":0.00015,"note":"Prefer subscription credits: ceil(max variant duration)×15. If balance cannot cover the whole job, PAYGO at ~$0.00015/s; no half-credit mix."}}}
  ```
- No idempotency-key field documented for this endpoint.

### 5.2 `GET /text-to-music/{gen_product_id}` — Query a text-to-music job's status

- Full description: "Poll for a single variant's status by its `gen_product_id` (one of the two IDs returned by `POST /v1/text-to-music`). Billing settles once both variants have succeeded — the longer of the 2 determines `effective_duration` and `credit_cost`; if either fails, nothing is charged. Rate limited to 60 requests / 60 seconds."
- Path param: `gen_product_id` — string, required.
- Responses: `200 application/json` Status retrieved successfully; `401`; `404 application/json` Record not found.
- Success body (`status: "succeeded"` example):
  ```json
  {"code":0,"message":"success","data":{"gen_product_id":"3f9a...tm_v1_tm","status":"succeeded","progress":"100%","batch_id":"8e21...","variant_index":0,"title":"Paper Moon Loop","duration":59,"audio_url":"https://storage.googleapis.com/...","credit_cost":1050,"effective_duration":70,"credit_charged":true,"api_billing":"credits"}}
  ```
- Terminal statuses: only `"submitted"` and `"succeeded"` appear in worked examples on the page itself. SECONDARY (skills repo, `t2m.py`): `TERMINAL_STATUSES = {"succeeded", "failed"}` is hardcoded — INFERRED that `"failed"` is the other terminal state; not shown in any official example.

### 5.3 `POST /text-to-music/cover/recognize-lyrics` — Recognize lyrics from a cover source track (sync)

- Content type: `multipart/form-data`
- Full description: "Transcribe lyrics from a source audio track before submitting a YuE2 cover. Provide one of `source_audio_file`, `source_audio_url`, or an already-owned `source_file_path` (`noiz_raw_{user_id}_*`). Charged only when vocals are detected: 100 subscription credits first, otherwise PAYGO $0.001 (same credit-to-USD rate as text-to-music). No vocals means no charge. Rate limited to 5 requests / 60 seconds."
- Fields:
  - `source_audio_file` — string · binary, optional. "Source audio (mp3/wav/flac/m4a/aac/ogg, max 100MB)."
  - `source_audio_url` — string, optional. "Public http(s) URL of the source audio."
  - `source_file_path` — string, optional. "Already-owned SpeechService blob name (`noiz_raw_{user_id}_*`)."
  - `source_mime_type` — string, optional. "MIME type hint when the filename/URL has no extension."
  - `idempotency_key` — string, optional. "Optional key (max 128 chars) to deduplicate recognition." — **This is the only endpoint in the whole R2 surface with a documented idempotency mechanism.**
- Responses: `200 application/json` Recognition finished; `401`; `402 application/json` "Insufficient credits and no payment method / usage limit exceeded."
- Success body:
  ```json
  {"code":0,"message":"success","data":{"has_vocals":true,"lyrics":"[Verse 1]\n...","credit_cost":100,"charged":true,"api_billing":"credits","credit_charged":true}}
  ```
- Sync — no polling needed.

### 5.4 `POST /text-to-music/cover` — Submit a YuE2 cover generation job (async)

- Content type: `multipart/form-data`
- Full description: "Cover an existing track with YuE2: supply source audio (file, URL, or an already-owned `source_file_path`) plus `lyrics` and `melody_adherence`. Returns 2 variants — poll `GET /v1/text-to-music/cover/{task_id}`. Same billing as text-to-music; monthly free quota and daily preview are not available on the API. Rate limited to 5 requests / 60 seconds."
- Fields:
  - `source_audio_file` — string · binary, optional (mp3/wav/flac/m4a/aac/ogg, max 100MB).
  - `source_audio_url` — string, optional.
  - `source_file_path` — string, optional (`noiz_raw_{user_id}_*`).
  - `source_mime_type` — string, optional.
  - `lyrics` — string, **required**. "Required. Lyrics to sing over the source melody."
  - `music_description` — string, optional. "Free-form description of the cover (required if `style` is empty)."
  - `style` — string, optional. "Style tags (required if `music_description` is empty)."
  - `melody_adherence` — string · enum, **required**. "`high` = full score (`cot=full`); `main_melody` = melody-only (`cot=melody`)." Possible values: `high`, `main_melody`.
  - `title` — string, optional. "Optional title; auto-generated if omitted."
  - `vocal_gender` — string · enum, optional. Possible values: `Male`, `Female`.
- Responses: `200 application/json` Cover job submitted successfully; `400 application/json` Validation error (missing source, lyrics, or melody_adherence); `401`; `402 application/json` "Insufficient credits and no payment method on file (or monthly hard limit reached). This endpoint has no duration parameter, so the pre-flight check always requires 2700 credits, a payment method, or `invoice` billing."
- Success body:
  ```json
  {"code":0,"message":"success","data":{"task_id":"8e21...","status":"submitted","stage":"score_pending","results":[{"gen_product_id":"3f9a...cm_v1_cm","status":"submitted"},{"gen_product_id":"3f9a...cm_v2_cm","status":"submitted"}],"pricing":{"credits_per_second":15,"usd_per_second":0.00015,"note":"Prefer subscription credits: ceil(max variant duration)×15. If balance cannot cover the whole job, PAYGO at ~$0.00015/s; no half-credit mix."}}}
  ```
  Note the added `stage` field (`score_pending` seen at submission) alongside `status` — no full enum of `stage` values is documented (only `score_pending` and `completed`, section 5.5, are ever shown).

### 5.5 `GET /text-to-music/cover/{task_id}` — Query a cover job and both variants

- Full description: "Poll the cover task. `results` contains both variants. Billing settles once both variants have succeeded — the longer of the 2 determines `effective_duration` and `credit_cost`; if either fails, nothing is charged. You can also poll a single variant with `GET /v1/text-to-music/{gen_product_id}`. Rate limited to 60 requests / 60 seconds."
- Path param: `task_id` — string, required. "The cover `task_id` returned by `POST /v1/text-to-music/cover`."
- Responses: `200 application/json` Status retrieved successfully; `401`; `404 application/json` Record not found.
- Success body:
  ```json
  {"code":0,"message":"success","data":{"task_id":"8e21...","status":"succeeded","stage":"completed","results":[{"gen_product_id":"3f9a...cm_v1_cm","cover_task_id":"8e21...","status":"succeeded","melody_adherence":"main_melody","duration":121,"audio_url":"https://storage.googleapis.com/...","credit_cost":2295,"effective_duration":153,"credit_charged":true,"api_billing":"credits"}]}}
  ```
  (Only one result item shown in the worked example; the field description states `results` "contains both variants" so treat this as illustrative, not a schema restriction to one item.)

**PRD §4 cross-check (Text-to-Music family):** every row PRD §4 stated for "Original songs", "Song inputs", "YuE2 limits", "Lyrics file", "Covers", "Cover source", and "Lyric recognition" is **CONFIRMED** verbatim by this fresh read — no corrections needed. New detail added beyond PRD: exact field names for every parameter above, the `source_file_path` (`noiz_raw_{user_id}_*`) owned-blob mechanism, the `idempotency_key` on recognize-lyrics only, the `stage` field on cover jobs, and the precise rate limits per sub-endpoint (submit: 5/60s; poll: 60/60s — both music and cover).

---

## 6. Guest TTS (context only — not a required R2 build target, but shares voice IDs with R2)

Source: `https://developers.noiz.ai/docs-guest`, 2026-09-30

### `POST /guest/text-to-speech` — no API key required

- Content type: `multipart/form-data`. "Text-to-speech for unauthenticated users. Rate-limited by IP address. Only whitelisted built-in voices are available. Text is limited to 400 characters. Each IP is limited to 5 requests per month."
- Fields: `text` (required, max 400 chars), `voice_id` (optional — "must be from the guest whitelist"; if omitted, default assigned by `target_lang`: en `95814add`, zh `3b9f1e27`, ja `063a4491`), `output_format` (enum `wav`/`mp3`, default `wav`), `target_lang` (optional), `speed` (0.5–2.0, default `1`), `filter_type` (enum, optional: `telephone`, `radio`, `hall`, `studio`).
- Full guest whitelist (15 voice IDs): en `95814add, 5a68d66b, a845c7de, 883b6b7c, 0e4ab6ec`; zh `3b9f1e27, b4775100, ac09aeb4, 87cb2405, 77e15f2c`; ja `063a4491, 4252b9c8, 578b4be2, f00e45a1, a9249ce7`.
- Responses: `200 audio/wav` binary (same `X-Timestamp`/`X-Audio-Duration` headers as §2.1); `400`, `429` (rate limit or monthly quota exceeded), `500`, `503` (service busy), `504` (inference timeout) — all `application/json`.
- Not part of the private single-owner R2 build (no auth = wrong trust model for this product) but useful because it fixes the meaning of the built-in `voice_id` values reused by `/text-to-speech`.

---

## 7. Text to Sound (confirms PRD §4) — and a real conflict with secondary evidence

Source: `https://developers.noiz.ai/docs-text-to-sound`, 2026-09-30

### 7.1 `POST /text-to-sound` — Generate sound from text

- Content type: `multipart/form-data`
- Full description: "Generate sound effects or music from a text prompt using AI. Returns the audio file bytes directly (not a URL). Billed at $0.001/second."
- Fields:
  - `prompt` — string, **required**. "Text description of the sound to generate (max 500 chars)." Max length: `500`.
  - `duration` — number, optional. "Duration of the generated audio in seconds (1-30)." Range: `1`–`30`. Default: `10`.
  - `output_format` — string · enum, optional. Default: `wav`. Possible values: `wav`, `mp3`.
- Responses: `200 audio/wav` — "Audio file bytes (wav or mp3)"; response documented identically to §2.1/§6: "Audio Binary Stream... raw audio bytes (`audio/wav` or `audio/mpeg`)... do not parse as JSON," headers `X-Timestamp`, `X-Audio-Duration`. `401 application/json`; `402 application/json` Insufficient credits; `429 application/json` Rate limit exceeded (5 requests per 60 seconds).
- **CONFLICT (primary docs vs. secondary evidence):** the official page unambiguously documents a **binary** success response with **no JSON envelope**. However `NoizAI/skills` → `skills/sound-fx/scripts/sfx.py` (SECONDARY) calls `resp.json()` on this same endpoint and expects `{"code":..., "data":{"results":[{"file_url":...,"error":...}]}}`, then issues a **second** `GET` to `file_url` to fetch the audio. This matches the shape of the `text-to-sound-history` list items (`file_url` field, §7.2) more than the current binary-response docs. Most likely explanation: the skill script predates a change from an async/JSON response to the current synchronous binary response, and is now stale. **Do not implement the JSON/`file_url` pattern** — trust the current binary-response docs — but flag this for a cheap, explicitly-approved live smoke test before relying on it in production, since the discrepancy was never resolved by re-reading a changelog (none was found).
- Also SECONDARY/INFERRED, unverified: `skills/sound-fx/SKILL.md` documents a third `--format flac` option, and `skills/tts/scripts/noiz_tts.py` sends `output_format=opus` (aliasing an `ogg` CLI choice) to the sibling `/text-to-speech` endpoint. Both contradict the documented `wav`/`mp3`-only enum on every audio-output endpoint. Treat any format outside `wav`/`mp3` as **unsupported until proven otherwise** by an explicitly authorized live call.

### 7.2 `GET /text-to-sound-history` — Get text-to-sound generation history

- Query params: `skip` (integer, optional, default `0`), `limit` (integer, optional, default `20`).
- Responses: `200 application/json` History retrieved successfully; `401 application/json`.
- Success body: `{"code":200,"data":{"list":[{"gen_product_id":"string","prompt":"string","duration":0,"file_url":"string","create_time":"string"}],"skip":0,"limit":0}}` — **note `"code":200`**, exactly as PRD §4 flagged.

### 7.3 `DELETE /text-to-sound-history/{gen_product_id}` — Delete a text-to-sound history record

- Path param: `gen_product_id`, required. "The generation product ID to delete."
- Responses: `200 application/json` Record deleted successfully; `401 application/json`.
- Success body: `{"code":200,"data":{"gen_product_id":"string"}}` — again `"code":200`.
- Confirms PRD §4's "Provider deletion is distinct from local archive/delete" framing: this only removes NOIZ's own history record, nothing about locally stored copies.

**PRD §4 cross-check (Text-to-Sound):** every PRD row ("Sound effects", "Sound history") is **CONFIRMED** exactly, including the `code:0` vs `code:200` split. The one new, important finding is the section 7.1 CONFLICT above, which PRD did not previously have visibility into (PRD only had the primary-docs read, not the skills-repo cross-check).

---

## 8. Secondary evidence summary (NoizAI/skills, read-only via `gh api`, no clone/auth)

Files inspected: `skills/tts/scripts/{tts.py,noiz_tts.py}`, `skills/tts/SKILL.md`, `skills/speech-to-text/scripts/stt.py`, `skills/sound-fx/scripts/sfx.py`, `skills/sound-fx/SKILL.md`, `skills/text-to-music/scripts/t2m.py`, `skills/chat-with-anyone/scripts/voice_design.py`.

Corroborating (matches primary docs, increases confidence):
- `stt.py` and `voice_design.py` both branch on `code == 0` for success and `code in {401,402,404,429,503}` for named errors — matches the business-code convention in section 0.
- `t2m.py`'s `MAX_COVER_SOURCE_BYTES = 100 * 1024 * 1024` matches the docs' "max 100MB" for cover/recognize-lyrics source audio.
- `noiz_tts.py` writes `resp.content` directly to disk and reads `X-Audio-Duration` from headers for both `/text-to-speech` and `/guest/text-to-speech` — matches the documented binary-response contract exactly (unlike the sound-fx conflict above).
- `t2m.py`'s hardcoded `TERMINAL_STATUSES = {"succeeded", "failed"}` is the only evidence (anywhere) that `"failed"` is a real terminal state for Text-to-Music/Cover jobs — INFERRED, not shown in any official JSON example.

CONFLICT / INFERRED gaps (do not build against these without a separately authorized live check):
1. `POST /text-to-sound` binary-vs-JSON conflict (section 7.1) — the most material one.
2. Undocumented output formats (`opus`, `flac`) referenced by skill CLIs/docs for TTS and Sound endpoints, vs. the official `wav`/`mp3`-only enum.
3. Client-side length caps in `t2m.py` (`MAX_PROMPT_LEN=1500`, `MAX_LYRICS_LEN=5000`, `MAX_TITLE_LEN=80`, `MAX_TAGS_LEN=50`) are **not** documented server-side limits — they are that one script's own guardrails and may not match actual API validation.
4. `noiz_tts.py`'s client-side `duration` range `(0, 36]` seconds for `/text-to-speech` is not stated anywhere in the official docs (which only give a default of `0` with no range) — INFERRED, unconfirmed.

---

## 9. Implementable now vs gated

| Endpoint / capability | Status | One-line reason |
| --- | --- | --- |
| `GET/POST/GET/DELETE /voices` | Implementable now | Full request/response schema documented for all four operations, including the soft-delete semantics. |
| `POST /text-to-speech` (`stream=false`) | Implementable now | Fields, limits (5000 chars), binary response, and headers are fully specified. |
| `POST /text-to-speech` (`stream=true`, long-form) | Implementable now | Fields and behavior (50000 chars, chunked WAV, billed at connection open) are explicitly documented as the current supported approach. |
| `POST /text-to-speech-large` + poll (deprecated long-form) | Gated — do not build | Docs explicitly say "no longer maintained"; building against it creates a migration liability the moment NOIZ removes it. |
| `POST /emotion-enhance` | Implementable now | Single required field, full success schema; only the numeric rate limit is unstated (acceptable — handle 429 reactively). |
| `POST /voice-design` | Implementable now | All fields, ranges, and the base64-audio preview response are documented. |
| `POST /speech-to-text` | Implementable now | Full format/size/duration limits and response schema (including per-segment speaker index) are documented. |
| `POST /text-to-music` (original songs) + poll | Implementable now | Full field list, YuE2 no-ops, pricing formula, and rate limits are documented; PRD's R1 adapter already targets this shape. |
| `POST /text-to-music/cover/recognize-lyrics` | Implementable now | Sync, fully specified, and the only endpoint with a documented idempotency key. |
| `POST /text-to-music/cover` + poll | Implementable now | Full field list (source/lyrics/melody_adherence), pricing, and rate limits documented; only the `stage` enum is partially observed (harmless — treat unknown `stage` values as "in progress"). |
| `POST /text-to-sound` (generate) | Gated on one point | Response *shape* conflicts between the current binary-only docs and the (likely stale) skills-repo script; everything else (limits, price, error codes) is solid — resolve the binary-vs-JSON question with one explicitly authorized live call before shipping. |
| `GET /text-to-sound-history`, `DELETE /text-to-sound-history/{id}` | Implementable now | Full schema documented, including the distinct `code:200` convention. |
| Any output format other than `wav`/`mp3` (`opus`, `ogg`, `flac`) on any endpoint | Gated | Only supported by unverified secondary evidence; the documented enum on every endpoint is `wav`/`mp3` only. |
| Guest TTS (`/guest/text-to-speech`) as a product feature | Gated — likely out of scope | No-auth, IP-quota (5/month) design doesn't fit a private, authenticated single-owner workspace; only useful here to resolve built-in `voice_id` meanings. |
| Proactive "monthly quota remaining" display | Gated | The docs confirm a monthly usage quota exists per API key but never state its numeric size; only reactive 429 handling is possible. |
| Strict field-level JSON error-body parsing for every 4xx/5xx (beyond the worked examples shown) | Gated | Several error responses (e.g., Voices' 400/401/404, most of Text-to-Speech's 400/401/402/500) are documented only as `status + one-line description + application/json`, with no worked JSON body — build a generic `{code,message}`-shaped parser with a safe fallback, not per-field-exact handling, until confirmed live. |

