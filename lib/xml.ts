/** Minimal, typed Plivo XML builders. */

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type Lang = "en" | "es";

export const VOICE: Record<Lang, { language: string; voice: string }> = {
  en: { language: "en-US", voice: "WOMAN" },
  es: { language: "es-ES", voice: "WOMAN" },
};

export function speak(text: string, lang: Lang = "en"): string {
  const { language, voice } = VOICE[lang];
  return `  <Speak language="${language}" voice="${voice}">${esc(text)}</Speak>`;
}

export function play(url: string): string {
  return `  <Play>${esc(url)}</Play>`;
}

export function redirect(url: string): string {
  return `  <Redirect>${esc(url)}</Redirect>`;
}

export function hangup(reason = "normal"): string {
  return `  <Hangup reason="${reason}"/>`;
}

/** <Dial> to the live associate, presenting the Plivo number as caller ID. */
export function dial(number: string, callerId: string): string {
  return [
    `  <Dial callerId="${esc(callerId)}" timeout="30">`,
    `    <Number>${esc(number)}</Number>`,
    `  </Dial>`,
  ].join("\n");
}

/**
 * <GetDigits> with the prompt nested inside so the caller can barge in with
 * DTMF before the prompt finishes.
 */
export function getDigits(opts: {
  action: string;
  numDigits: number;
  prompt: string;
  timeout?: number;
  digitTimeout?: number;
}): string {
  const { action, numDigits, prompt, timeout = 12, digitTimeout = 5 } = opts;
  return [
    `  <GetDigits action="${esc(action)}" method="POST" timeout="${timeout}" digitTimeout="${digitTimeout}" numDigits="${numDigits}" retries="1" redirect="true">`,
    prompt.replace(/^/gm, "  "),
    `  </GetDigits>`,
  ].join("\n");
}

/** Wrap elements in <Response> and return with the correct content type. */
export function xmlResponse(...parts: string[]): Response {
  const body = `<?xml version="1.0" encoding="utf-8"?>\n<Response>\n${parts.join("\n")}\n</Response>`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}
