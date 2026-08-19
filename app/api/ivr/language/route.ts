import { baseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { speak, redirect, xmlResponse } from "@/lib/xml";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Level 1 branching: 1 = English, 2 = Spanish, anything else re-prompts. */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const token = p.token ?? null;

  if (!verifySession(p.CallUUID ?? "unknown", token)) {
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
