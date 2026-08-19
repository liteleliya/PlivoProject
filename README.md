# Plivo IVR Demo — InspireWorks

An outbound-call IVR built on the Plivo Voice API. The system places a call,
authenticates the caller with a 4-digit OTP over DTMF, and then serves a
two-level menu with language selection, audio playback, and call forwarding.

Built as the Plivo Forward Deployed Engineer technical assignment.

## Call flow

```
  POST /api/call ──── Plivo REST API ────> outbound call placed
                                                  │
                                          caller answers
                                                  │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │  /api/ivr/answer         │  "Enter your 4-digit OTP"
                                    │  <GetDigits numDigits=4> │
                                    └────────────┬─────────────┘
                                                 ▼
                                    ┌──────────────────────────┐
                                    │  /api/ivr/otp            │
                                    └──────┬────────────┬──────┘
                                  wrong ───┘            └─── correct
                                    │                        │
                          re-prompt (up to 5x)        mint session token
                                    │                        │
                                    └──> back to answer      ▼
                                                 ┌──────────────────────────┐
                                    LEVEL 1      │  /api/ivr/menu           │  "1 English · 2 Español"
                                                 │  <GetDigits numDigits=1> │
                                                 └────────────┬─────────────┘
                                                              ▼
                                                 ┌──────────────────────────┐
                                                 │  /api/ivr/language       │  branch on digit
                                                 └────────────┬─────────────┘
                                                              ▼
                                                 ┌──────────────────────────┐
                                    LEVEL 2      │  /api/ivr/options        │  "1 audio · 2 associate"
                                                 │  <GetDigits numDigits=1> │  (in the chosen language)
                                                 └────────────┬─────────────┘
                                                              ▼
                                                 ┌──────────────────────────┐
                                                 │  /api/ivr/action         │
                                                 └──────┬────────────┬──────┘
                                                press 1 ┘            └ press 2
                                                   │                    │
                                              <Play> MP3          <Dial> associate
                                                   │
                                            back to Level 2
```

## Design notes

**No database.** The OTP is hardcoded, as the assignment specifies. State
between webhook hops (attempt count, chosen language, authentication status)
travels in the query string of the `action` URLs.

**The menu is not reachable without passing the OTP.** Because state lives in
URLs, the menu endpoints would otherwise be directly callable. On a correct OTP
the app mints an HMAC over the `CallUUID` (`lib/session.ts`) and carries it
through the remaining hops; every menu route verifies it with a constant-time
comparison and bounces unauthenticated callers back to the OTP prompt.

**Prompts are nested inside `<GetDigits>`** so a caller who knows the menu can
barge in with DTMF before the prompt finishes playing.

**Timeouts are handled distinctly from wrong input.** When a caller enters
nothing, Plivo falls through past `<GetDigits>` rather than calling the action
URL — so each menu ends with a `<Speak>` plus `<Redirect>` that re-asks.

**OTP re-prompts are capped at 5** (`cfg.maxOtpAttempts`), then the call hangs
up gracefully. The assignment asks to re-prompt until correct; an unbounded
loop on a live, billed call is a footgun, so the cap is the one deliberate
deviation.

**Webhook URLs are derived from the request host**, overridable with
`PUBLIC_BASE_URL`, so the same build works behind a tunnel and on Vercel.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

### Environment variables

| Variable | Purpose |
|---|---|
| `PLIVO_AUTH_ID` | Plivo Auth ID |
| `PLIVO_AUTH_TOKEN` | Plivo Auth Token |
| `PLIVO_FROM_NUMBER` | Plivo number the call is placed from |
| `ASSOCIATE_NUMBER` | "Live associate" number for Level 2 → 2 |
| `OTP_CODE` | 4-digit OTP, birthdate in DDMM |
| `TARGET_NUMBER` | Optional default destination; the UI can override it |
| `PUBLIC_BASE_URL` | Public HTTPS base URL; blank = derive from request |
| `SESSION_SECRET` | Key used to sign the post-OTP session token |
| `AUDIO_URL` | Publicly reachable MP3 for Level 2 → 1 |

`.env.local` is gitignored; credentials never enter the repository.

## Plivo needs a public HTTPS URL

Plivo fetches call flow XML from your server, so `localhost` will not work —
the app returns an explicit error if you try to place a call from localhost.
Use either:

```bash
# Option A — deploy (only needs port 443)
npx vercel deploy --prod

# Option B — tunnel (needs outbound port 7844; blocked on some networks)
cloudflared tunnel --url http://localhost:3000
```

Then set `PUBLIC_BASE_URL` to the resulting HTTPS URL.

## Running and testing

Open http://localhost:3000, enter a destination number in E.164 format
(`+919876543210`) and press **Place call**. The page also shows a live
configuration panel — whether credentials loaded and whether the current public
URL is actually reachable by Plivo.

`GET /api/call` returns the same diagnostics as JSON.

To exercise the full IVR state machine without spending a phone call, the test
harness replays the exact form-encoded webhooks Plivo sends and asserts on the
returned XML:

```bash
./scripts/test-ivr.sh                      # against localhost:3000
./scripts/test-ivr.sh https://your.app     # against a deployment
```

It covers 18 cases: the OTP gate and re-prompt loop, the attempt cap, direct
access to menu routes without a token, a forged token, both language branches,
invalid digits at each level, audio playback, and forwarding to the associate.

## Project layout

```
app/
  page.tsx                 trigger UI + live diagnostics
  api/call/route.ts        POST places the call · GET returns diagnostics
  api/ivr/answer/          OTP prompt
  api/ivr/otp/             OTP verification, session minting
  api/ivr/menu/            Level 1 — language
  api/ivr/language/        Level 1 branching
  api/ivr/options/         Level 2 — actions, localised
  api/ivr/action/          Level 2 branching — <Play> / <Dial>
  api/ivr/events/          hangup_url callback logging
lib/
  config.ts   xml.ts   session.ts   params.ts
scripts/
  test-ivr.sh              end-to-end webhook replay tests
```
