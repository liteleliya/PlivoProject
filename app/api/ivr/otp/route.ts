import { cfg, baseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { speak, redirect, xmlResponse } from "@/lib/xml";
import { signSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Checks the entered digits; a correct OTP mints the session token. */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const attempt = Number(p.attempt ?? 1);
  const callUuid = p.CallUUID ?? "unknown";

  if ((p.Digits ?? "").trim() === cfg.otpCode) {
    return xmlResponse(
      speak("Thank you. You have been authenticated."),
      redirect(urlWith(base, "/api/ivr/menu", { token: signSession(callUuid) })),
    );
  }

  return xmlResponse(
    redirect(urlWith(base, "/api/ivr/answer", { attempt: attempt + 1, retry: 1 })),
  );
}

export const GET = handler;
export const POST = handler;
