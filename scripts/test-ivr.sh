#!/usr/bin/env bash
# End-to-end exercise of the IVR state machine without placing a real call.
# Simulates the form-encoded webhooks Plivo sends and prints the XML returned.
#
#   ./scripts/test-ivr.sh [base-url]      (default: http://localhost:3000)

set -u
BASE="${1:-http://localhost:3000}"
UUID="test-$(date +%s)"
PASS=0; FAIL=0

hdr() { printf "\n\033[1m── %s\033[0m\n" "$1"; }
post() { curl -s -X POST "$BASE$1" -d "CallUUID=$UUID&${2:-}"; }
# expect <label> <xml> <pattern>
expect() {
  local flat; flat=$(tr -d "\n" <<<"$2")   # XML spans lines; grep is line-based
  if grep -qE "$3" <<<"$flat"; then printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1))
  else printf "  \033[31m✗\033[0m %s\n     expected /%s/ in:\n%s\n" "$1" "$3" "$2"; FAIL=$((FAIL+1)); fi
}

# refute <label> <xml> <pattern>  - passes when the pattern is absent
refute() {
  local flat; flat=$(tr -d "\n" <<<"$2")
  if grep -qE "$3" <<<"$flat"; then printf "  \033[31m✗\033[0m %s\n     unexpected /%s/ in:\n%s\n" "$1" "$3" "$2"; FAIL=$((FAIL+1))
  else printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); fi
}

hdr "OTP gate"
X=$(post "/api/ivr/answer?attempt=1")
expect "answer prompts for 4 digits" "$X" 'numDigits="4"'
expect "prompt nested inside GetDigits for barge-in" "$X" '<GetDigits[^>]*>\s*<Speak'
expect "digitTimeout set so slow entry is not truncated" "$X" 'digitTimeout="[5-9]|digitTimeout="[1-9][0-9]'

X=$(post "/api/ivr/otp?attempt=1" "Digits=1111")
expect "wrong OTP redirects back to prompt" "$X" 'answer\?attempt=2&amp;retry=1'

X=$(post "/api/ivr/answer?attempt=2&retry=1")
expect "re-prompt states the OTP was wrong" "$X" 'not correct'

X=$(post "/api/ivr/otp?attempt=2" "Digits=2008")
expect "correct OTP authenticates" "$X" 'authenticated'
expect "correct OTP mints a session token" "$X" 'menu\?token=[a-f0-9]{32}'
TOKEN=$(grep -oE 'token=[a-f0-9]{32}' <<<"$X" | head -1 | cut -d= -f2)

X=$(post "/api/ivr/answer?attempt=50")
expect "re-prompts indefinitely, never hangs up (spec requirement)" "$X" 'numDigits="4"'
refute "no Hangup on repeated wrong entries" "$X" '<Hangup'

X=$(post "/api/ivr/answer?attempt=1")
expect "incomplete-entry fallback names the real problem" "$X" 'did not get all four digits'
refute "incomplete-entry fallback avoids the misleading wording" "$X" 'did not receive any input'
refute "no XML entities in spoken text" "$X" '&(apos|quot);'

hdr "Authentication gating"
X=$(post "/api/ivr/menu")
expect "menu without a token bounces to OTP" "$X" 'Authentication required'
X=$(post "/api/ivr/action?token=deadbeefdeadbeefdeadbeefdeadbeef&lang=en" "Digits=2")
expect "forged token is rejected" "$X" 'ivr/answer'

hdr "Level 1 — language"
X=$(post "/api/ivr/menu?token=$TOKEN")
expect "offers English" "$X" 'For English, press 1'
expect "uses Polly voices, not the defaults" "$X" 'voice="Polly\.'
expect "offers Spanish in es-ES voice" "$X" 'language="es-ES"[^>]*>Para español'
expect "1s pause between the two languages" "$X" 'press 1\.</Speak>\s*<Play>[^<]*silence-1s\.mp3</Play>\s*<Speak[^>]*es-ES'

X=$(post "/api/ivr/language?token=$TOKEN" "Digits=1")
expect "press 1 selects English" "$X" 'lang=en'
X=$(post "/api/ivr/language?token=$TOKEN" "Digits=2")
expect "press 2 selects Spanish" "$X" 'lang=es'
X=$(post "/api/ivr/language?token=$TOKEN" "Digits=9")
expect "invalid digit re-prompts Level 1" "$X" 'menu\?token=[a-f0-9]+&amp;invalid=1'

hdr "Level 2 — actions"
X=$(post "/api/ivr/options?token=$TOKEN&lang=es")
expect "Spanish Level 2 menu" "$X" 'Oprima 1 para escuchar'

X=$(post "/api/ivr/action?token=$TOKEN&lang=en" "Digits=1")
expect "press 1 plays English audio over HTTPS" "$X" '<Play>https?://[^<]*message-en\.mp3</Play>'
X=$(post "/api/ivr/action?token=$TOKEN&lang=es" "Digits=1")
expect "press 1 plays Spanish audio" "$X" '<Play>https?://[^<]*message-es\.mp3</Play>'
X=$(post "/api/ivr/action?token=$TOKEN&lang=es" "Digits=2")
expect "press 2 dials the associate" "$X" '<Dial[^>]*>.*<Number>\+'
X=$(post "/api/ivr/action?token=$TOKEN&lang=en" "Digits=7")
expect "invalid digit re-prompts Level 2" "$X" 'invalid=1'

printf "\n\033[1m%d passed, %d failed\033[0m\n" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
