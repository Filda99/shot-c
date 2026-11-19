/* Shot-C: přihlášení k newsletteru (Cloudflare Worker).
   Web (statický, GitHub Pages) posílá e-mail a jméno sem; Worker je přepošle do Senderu
   přes oficiální API. API klíč Senderu je jen tady, v tajné proměnné SENDER_API_KEY,
   nikdy ve webu ani v gitu.

   Proměnné (Cloudflare → Worker → Settings → Variables):
     SENDER_API_KEY   (Secret)  API token ze Senderu (Settings → API access tokens)
     SENDER_GROUP_ID  (Text)    ID skupiny, do které se přihlášený přidá (např. „eZVD4w“)
     ALLOWED_ORIGINS  (Text)    odkud smí přijít požadavek, oddělené čárkou
                                (výchozí: https://www.shot-c.cz,https://shot-c.cz)

   Double opt-in: Sender ho u API sám nedělá. Zajišťuje ho automatizace v Senderu
   se spouštěčem „Subscriber is added to a group“ (viz worker/README.md). */

const DEFAULT_ORIGINS = 'https://www.shot-c.cz,https://shot-c.cz';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((s) => s.trim());
    const origin = request.headers.get('Origin') || '';
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' }
      : {};

    if (request.method === 'OPTIONS') { return new Response(null, { status: 204, headers: cors }); }
    if (request.method !== 'POST') { return json({ ok: false, error: 'method' }, 405, cors); }
    if (!cors['Access-Control-Allow-Origin']) { return json({ ok: false, error: 'origin' }, 403, cors); }

    let data;
    try { data = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid' }, 400, cors); }

    // Past na roboty: skryté pole, které člověk nevyplní. Robotovi tváříme úspěch.
    if (data.web) { return json({ ok: true }, 200, cors); }

    const email = String(data.email || '').trim().toLowerCase();
    const name = String(data.name || '').trim().slice(0, 80);
    if (!EMAIL_RE.test(email) || email.length > 254) { return json({ ok: false, error: 'email' }, 400, cors); }
    if (data.consent !== true) { return json({ ok: false, error: 'consent' }, 400, cors); }

    if (!env.SENDER_API_KEY || !env.SENDER_GROUP_ID) { return json({ ok: false, error: 'config' }, 500, cors); }

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

    // Už přihlášený odběratel: pro návštěvníka je to v pořádku.
    const text = await res.text().catch(() => '');
    if (res.status === 422 && /exist|already|taken/i.test(text)) { return json({ ok: true, existing: true }, 200, cors); }

    console.log('Sender API', res.status, text.slice(0, 300));
    return json({ ok: false, error: 'upstream' }, 502, cors);
  }
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
