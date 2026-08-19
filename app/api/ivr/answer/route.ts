import { cfg, baseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { getDigits, speak, redirect, hangup, xmlResponse } from "@/lib/xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entry point of the call (answer_url). Prompts for the 4-digit OTP.
 * `attempt` tracks how many times we have asked, so a caller who never enters
 * anything does not loop forever.
 */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const attempt = Number(p.attempt ?? 1);
  const retry = p.retry === "1";

  if (attempt > cfg.maxOtpAttempts) {
    return xmlResponse(
      speak("Too many incorrect attempts. Goodbye."),
      hangup(),
    );
  }

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
