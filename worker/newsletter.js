/* Shot-C: přihlášení k newsletteru (Cloudflare Worker).
   Web (statický, GitHub Pages) posílá e-mail a jméno sem; Worker je ověří a přepošle
   do Senderu přes oficiální API. Tajné klíče jsou jen v Cloudflare, nikdy ve webu ani v gitu.

   Proměnné (Cloudflare → Worker → Settings → Variables and Secrets):
     SENDER_API_KEY    (Secret)  API token ze Senderu
     TURNSTILE_SECRET  (Secret)  tajný klíč Cloudflare Turnstile (ochrana proti robotům)
     SENDER_GROUP_ID   (Text)    ID skupiny „Newsletter – čeká na potvrzení“
     ALLOWED_ORIGINS   (Text)    odkud smí přijít požadavek, oddělené čárkou
   Volitelně vazba NL_LIMIT (Rate limiting) – omezí počet pokusů z jedné IP adresy.

   Double opt-in: zajišťuje automatizace v Senderu (viz worker/README.md). */

const DEFAULT_ORIGINS = 'https://www.shot-c.cz,https://shot-c.cz';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
const MAX_BODY = 4096; // B; skutečná přihláška má kolem 1–2 kB (hlavně token Turnstile)

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' }
      : {};

    if (request.method === 'OPTIONS') { return new Response(null, { status: 204, headers: cors }); }
    if (request.method !== 'POST') { return json({ ok: false, error: 'method' }, 405, cors); }
    // Zastaví cizí weby v prohlížeči návštěvníka. Proti skriptům (Origin jde podvrhnout) chrání Turnstile a limit níže.
    if (!cors['Access-Control-Allow-Origin']) { return json({ ok: false, error: 'origin' }, 403, cors); }

    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (env.NL_LIMIT) {
      const { success } = await env.NL_LIMIT.limit({ key: ip || 'unknown' });
      if (!success) { return json({ ok: false, error: 'rate' }, 429, cors); }
    }

    if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) { return json({ ok: false, error: 'size' }, 413, cors); }
    let data;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY) { return json({ ok: false, error: 'size' }, 413, cors); }
      data = JSON.parse(raw);
    } catch (e) { return json({ ok: false, error: 'invalid' }, 400, cors); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) { return json({ ok: false, error: 'invalid' }, 400, cors); }

    // Past na roboty: skryté pole, které člověk nevyplní. Robotovi tváříme úspěch.
    if (data.hp_field) { return json({ ok: true }, 200, cors); }

    if (typeof data.email !== 'string') { return json({ ok: false, error: 'email' }, 400, cors); }
    const email = data.email.trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) { return json({ ok: false, error: 'email' }, 400, cors); }

    // Jméno: bez řídicích znaků a HTML, krátké a bez odkazů (aby se přes něj nedal poslat spam).
    const name = (typeof data.name === 'string' ? data.name : '')
      .replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50);
    if (/https?:|www\.|\.[a-z]{2,}(\/|$)|@/i.test(name)) { return json({ ok: false, error: 'name' }, 400, cors); }

    if (data.consent !== true) { return json({ ok: false, error: 'consent' }, 400, cors); }

    if (!env.SENDER_API_KEY || !env.SENDER_GROUP_ID || !env.TURNSTILE_SECRET) { return json({ ok: false, error: 'config' }, 500, cors); }

    // Ověření Turnstile (prokáže, že formulář vyplnil člověk na našem webu).
    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: typeof data.token === 'string' ? data.token.slice(0, 2048) : '', remoteip: ip })
    }).then((r) => r.json()).catch(() => ({}));
    if (!check.success) { return json({ ok: false, error: 'captcha' }, 403, cors); }

    const body = { email, groups: [env.SENDER_GROUP_ID], trigger_automation: true };
    if (name) { body.firstname = name; }

    let res;
    try {
      res = await fetch('https://api.sender.net/v2/subscribers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.SENDER_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      return json({ ok: false, error: 'upstream' }, 502, cors);
    }

    if (res.ok) { return json({ ok: true }, 200, cors); }

    // Už přihlášený odběratel: návštěvník dostane stejnou odpověď jako nový (nedá se tak zjistit, kdo odebírá).
    const text = await res.text().catch(() => '');
    if (res.status === 422 && /exist|already|taken/i.test(text)) { return json({ ok: true }, 200, cors); }

    // Do logu jen stavový kód, ne odpověď Senderu (mohla by obsahovat e-mail nebo jméno).
    console.log('Sender API status', res.status);
    return json({ ok: false, error: 'upstream' }, 502, cors);
  }
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
