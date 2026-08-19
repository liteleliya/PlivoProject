import { baseUrl, pauseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { getDigits, speak, play, redirect, xmlResponse } from "@/lib/xml";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** IVR Level 1 - language selection. Only reachable with a valid OTP session. */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const token = p.token ?? null;
  const callUuid = p.CallUUID ?? "unknown";

  if (!verifySession(callUuid, token)) {
    return xmlResponse(
      speak("Authentication required."),
      redirect(urlWith(base, "/api/ivr/answer", { attempt: 1 })),
    );
  }

  const invalid = p.invalid === "1";

  return xmlResponse(
    ...(invalid ? [speak("Sorry, that was not a valid choice.")] : []),
    getDigits({
      action: urlWith(base, "/api/ivr/language", { token }),
      numDigits: 1,
      prompt: [
        speak("For English, press 1.", "en"),
        // A beat between the two languages; back to back sounds clipped.
        play(pauseUrl(base)),
        speak("Para español, oprima 2.", "es"),
      ].join("\n"),
    }),
    speak("We did not receive any input."),
    redirect(urlWith(base, "/api/ivr/menu", { token })),
  );
}

export const GET = handler;
export const POST = handler;
