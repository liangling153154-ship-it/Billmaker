// Supabase connection shared by vi.html, index.html and combo.html.
// The publishable key is meant to be public: the database lets it read, add and
// edit invoices but never delete them (see supabase/schema.sql).
const SB_URL = 'https://hqomllgssmutrqtguedh.supabase.co';
const SB_KEY = 'sb_publishable_8kBE_O-ZZ425DpwaNA7fqA_HA1psZVW';

// sb('combos?select=code', {method, body, prefer}) → parsed JSON (or null).
// Network errors and 5xx are retried twice; 4xx (bad request, no permission) fail at once.
async function sb(path, {method = 'GET', body, prefer} = {}) {
  const headers = {apikey: SB_KEY, 'Content-Type': 'application/json'};
  if (prefer) headers.Prefer = prefer;
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/' + path,
        {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw Object.assign(new Error((data && data.message) || 'HTTP ' + r.status), {fatal: r.status < 500});
      return data;
    } catch (e) {
      last = e;
      if (e.fatal) break;
      await new Promise(res => setTimeout(res, 600 * (i + 1)));
    }
  }
  throw last;
}
