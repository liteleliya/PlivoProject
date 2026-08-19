import { baseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { getDigits, speak, redirect, xmlResponse } from "@/lib/xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entry point of the call (answer_url). Prompts for the 4-digit OTP.
 *
 * Per the assignment, the bot re-prompts until the correct OTP is entered, so
 * there is no attempt limit. `attempt` is carried only to vary the wording and
 * to make the retry count visible in logs. The call itself bounds the loop:
 * it ends when the caller hangs up.
 */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const attempt = Number(p.attempt ?? 1);
  const retry = p.retry === "1";

  const greeting = retry
    ? speak("That O T P was not correct. Please try again.")
    : speak("Welcome to Inspire Works. This call is protected by a one time pass code.");

  return xmlResponse(
    greeting,
    getDigits({
      action: urlWith(base, "/api/ivr/otp", { attempt }),
      numDigits: 4,
      timeout: 12,
      prompt: speak("Using your phone keypad, please enter your 4 digit O T P."),
    }),
    // Reached only when the caller entered nothing before the timeout.
    speak("We did not receive any input."),
    redirect(urlWith(base, "/api/ivr/answer", { attempt: attempt + 1 })),
  );
}

export const GET = handler;
export const POST = handler;
