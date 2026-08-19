/**
 * Plivo delivers webhook data as application/x-www-form-urlencoded POST bodies.
 * Our own state (language, attempt count, session token) travels in the query
 * string of the action URLs. This merges both into one lookup.
 */
export async function plivoParams(req: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  for (const [k, v] of new URL(req.url).searchParams) params[k] = v;

  if (req.method === "POST") {
    try {
      const form = await req.formData();
      for (const [k, v] of form.entries()) params[k] = String(v);
    } catch {
      // Body was not form-encoded; query parameters alone are enough.
    }
  }
  return params;
}

/** Build an absolute URL with query parameters. */
export function urlWith(base: string, path: string, q: Record<string, string | number>): string {
  const u = new URL(path, base);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, String(v));
  return u.toString();
}
