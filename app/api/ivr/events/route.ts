export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * hangup_url target. Plivo posts the final call state here; logging it makes
 * failures (busy, no-answer, rejected) visible in the dev server output.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const data = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    console.log("[plivo:hangup]", {
      CallUUID: data.CallUUID,
      CallStatus: data.CallStatus,
      HangupCause: data.HangupCauseName ?? data.HangupCause,
      Duration: data.Duration,
    });
  } catch {
    // Ignore malformed callbacks.
  }
  return new Response("", { status: 204 });
}
