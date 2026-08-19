/**
 * Merges Plivo's form-encoded POST body with our own state carried in the
 * query string (language, attempt count, session token).
 */
export async function plivoParams(req: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  for (const [k, v] of new URL(req.url).searchParams) params[k] = v;

  if (req.method === "POST") {
    try {
      const form = await req.formData();
      for (const [k, v] of form.entries()) params[k] = String(v);
    } catch {
      // No form body; query parameters are enough.
    }
  }
  return params;
}

export function urlWith(base: string, path: string, q: Record<string, string | number>): string {
  const u = new URL(path, base);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, String(v));
  return u.toString();
}
