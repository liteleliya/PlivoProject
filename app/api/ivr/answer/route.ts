import { baseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { getDigits, speak, redirect, xmlResponse } from "@/lib/xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Call entry point (answer_url): prompts for the OTP. Re-prompts without
 * limit, as the assignment requires; the loop ends when the caller hangs up.
 */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const attempt = Number(p.attempt ?? 1);

  const greeting =
    p.retry === "1"
      ? speak("That O T P was not correct. Please try again.")
      : speak("Welcome to Inspire Works. This call is protected by a one time pass code.");

  return xmlResponse(
    greeting,
    getDigits({
      action: urlWith(base, "/api/ivr/otp", { attempt }),
      numDigits: 4,
      prompt: speak("Using your phone keypad, please enter your 4 digit O T P."),
    }),
    // Fall-through: no digits, or fewer than four followed by a pause.
    // Plivo discards partial input rather than submitting it.
    speak("Sorry, we did not get all four digits. Please try again."),
    redirect(urlWith(base, "/api/ivr/answer", { attempt: attempt + 1 })),
  );
}

export const GET = handler;
export const POST = handler;
