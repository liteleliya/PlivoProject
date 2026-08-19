import { cfg, baseUrl, audioUrl } from "@/lib/config";
import { plivoParams, urlWith } from "@/lib/params";
import { speak, play, dial, redirect, hangup, xmlResponse, type Lang } from "@/lib/xml";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMPTS: Record<Lang, { playing: string; connecting: string; done: string }> = {
  en: {
    playing: "Here is your audio message.",
    connecting: "Please hold while we connect you to a live associate.",
    done: "Thank you for calling Inspire Works. Goodbye.",
  },
  es: {
    playing: "Aquí está su mensaje de audio.",
    connecting: "Por favor espere mientras le conectamos con un agente.",
    done: "Gracias por llamar a Inspire Works. Adiós.",
  },
};

/** Terminal branch of the IVR: play an MP3, or forward to the associate. */
async function handler(req: Request) {
  const p = await plivoParams(req);
  const base = baseUrl(req);
  const token = p.token ?? null;
  const callUuid = p.CallUUID ?? "unknown";
  const lang: Lang = p.lang === "es" ? "es" : "en";
  const t = PROMPTS[lang];

  if (!verifySession(callUuid, token)) {
    return xmlResponse(redirect(urlWith(base, "/api/ivr/answer", { attempt: 1 })));
  }

  const digit = (p.Digits ?? "").trim();

  if (digit === "1") {
    return xmlResponse(
      speak(t.playing, lang),
      play(audioUrl(lang, base)),
      // Return to the Level 2 menu so the caller can pick another option.
      redirect(urlWith(base, "/api/ivr/options", { token, lang })),
    );
  }

  if (digit === "2") {
    return xmlResponse(
      speak(t.connecting, lang),
      dial(cfg.associateNumber, cfg.fromNumber),
      speak(t.done, lang),
      hangup(),
    );
  }

  return xmlResponse(redirect(urlWith(base, "/api/ivr/options", { token, lang, invalid: 1 })));
}

export const GET = handler;
export const POST = handler;
