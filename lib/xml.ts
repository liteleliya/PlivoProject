export type Lang = "en" | "es";

export const VOICE: Record<Lang, { language: string; voice: string }> = {
  en: { language: "en-US", voice: "Polly.Kendra" },
  es: { language: "es-ES", voice: "Polly.Conchita" },
};

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

export function dial(number: string, callerId: string): string {
  return [
    `  <Dial callerId="${esc(callerId)}" timeout="30">`,
    `    <Number>${esc(number)}</Number>`,
    `  </Dial>`,
  ].join("\n");
}

/**
 * Digit collection with the prompt nested inside, so callers can barge in.
 * digitTimeout defaults to 5s: Plivo's 2s default cuts off multi-digit entry
 * at a normal keying pace.
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

export function xmlResponse(...parts: string[]): Response {
  const body = `<?xml version="1.0" encoding="utf-8"?>\n<Response>\n${parts.join("\n")}\n</Response>`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}
