import { baseUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { getDigits, speak, redirect, xmlResponse, type Lang } from "@/lib/xml";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMPTS: Record<Lang, { menu: string; invalid: string; noInput: string }> = {
  en: {
    menu: "Press 1 to listen to a short audio message. Press 2 to be connected to a live associate.",
    invalid: "Sorry, that was not a valid choice.",
    noInput: "We did not receive any input.",
  },
  es: {
    menu: "Oprima 1 para escuchar un breve mensaje de audio. Oprima 2 para hablar con un agente.",
    invalid: "Lo sentimos, esa opción no es válida.",
    noInput: "No recibimos ninguna entrada.",
  },
};

/** Level 2: action menu, in the language chosen at Level 1. */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const token = p.token ?? null;
  const lang: Lang = p.lang === "es" ? "es" : "en";
  const t = PROMPTS[lang];

  if (!verifySession(p.CallUUID ?? "unknown", token)) {
    return xmlResponse(redirect(urlWith(base, "/api/ivr/answer", { attempt: 1 })));
  }

  return xmlResponse(
    ...(p.invalid === "1" ? [speak(t.invalid, lang)] : []),
    getDigits({
      action: urlWith(base, "/api/ivr/action", { token, lang }),
      numDigits: 1,
      prompt: speak(t.menu, lang),
    }),
    speak(t.noInput, lang),
    redirect(urlWith(base, "/api/ivr/options", { token, lang })),
  );
}

export const GET = handler;
export const POST = handler;
