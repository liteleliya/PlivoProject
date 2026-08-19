export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** hangup_url callback: logs final call state for observability. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const d = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    console.log("[plivo:hangup]", {
      CallUUID: d.CallUUID,
      CallStatus: d.CallStatus,
      HangupCause: d.HangupCauseName ?? d.HangupCause,
      Duration: d.Duration,
    });
  } catch {
    // Malformed callback; nothing to log.
  }
  return new Response(null, { status: 204 });
}
