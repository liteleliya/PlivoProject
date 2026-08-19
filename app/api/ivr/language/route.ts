import { baseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { speak, redirect, xmlResponse } from "@/lib/xml";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Branches on the Level 1 digit. Invalid input re-plays the Level 1 prompt. */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const token = p.token ?? null;
  const callUuid = p.CallUUID ?? "unknown";

  if (!verifySession(callUuid, token)) {
    return xmlResponse(redirect(urlWith(base, "/api/ivr/answer", { attempt: 1 })));
  }

  const digit = (p.Digits ?? "").trim();
  const lang = digit === "1" ? "en" : digit === "2" ? "es" : null;

  if (!lang) {
    return xmlResponse(redirect(urlWith(base, "/api/ivr/menu", { token, invalid: 1 })));
  }

  return xmlResponse(
    speak(lang === "en" ? "English selected." : "Español seleccionado.", lang),
    redirect(urlWith(base, "/api/ivr/options", { token, lang })),
  );
}

export const GET = handler;
export const POST = handler;
