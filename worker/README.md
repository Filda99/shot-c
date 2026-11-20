# Newsletter: formulář na webu → Cloudflare Worker → Sender

## Jak to funguje

1. Návštěvník vyplní v sekci Novinky e-mail (a případně jméno) a zaškrtne souhlas.
2. **Cloudflare Turnstile** (malé, většinou neviditelné ověření) potvrdí, že je to člověk.
3. Prohlížeč pošle data přes HTTPS na **Worker** (malý program na Cloudflare, zdarma).
4. Worker zkontroluje ověření, e-mail i souhlas a přes **oficiální API Senderu** přidá
   člověka do skupiny `Newsletter – čeká na potvrzení`. API klíč Senderu je jen ve Workeru.
5. **Automatizace v Senderu** mu pošle potvrzovací e-mail. Až klikne, přesune se do
   skupiny `Newsletter`. Kdo nepotvrdí, je po pár dnech smazán.

Na web (GitHub Pages) se tahle složka nenasazuje. Žádný klíč není v repu ani na webu.

## Nastavení krok za krokem

### A. Sender
1. **Skupiny** (Subscribers → Groups): `Newsletter – čeká na potvrzení` a `Newsletter`.
   ID skupiny je v adrese po kliknutí na skupinu (krátký kód, např. `eZVD4w`).
2. **Automatizace double opt-in** ([návod Senderu](https://www.sender.net/help/automation/double-opt-in/)):
   spouštěč *Subscriber is added to a group* → `Newsletter – čeká na potvrzení` →
   e-mail s tlačítkem „Potvrdit odběr“ (bez oslovení jménem) → Delay 3 dny →
   Condition *Link is clicked* → **ano**: *Move subscriber to another group* → `Newsletter`;
   **ne**: odebrat ze skupiny / smazat odběratele (neukládáme data bez potvrzeného souhlasu).
3. **API token**: Settings → API access tokens → vytvořit a zkopírovat.
4. ⚠️ **Kampaně posílat jen skupině `Newsletter`**, nikdy „All subscribers“. Jinak by
   dostali e-maily i ti, kdo nepotvrdili.

### B. Cloudflare (účet zdarma na dash.cloudflare.com)
1. **Turnstile** → Add widget → název `shot-c newsletter`, doména `shot-c.cz`, režim *Managed*.
   Dostaneš **Site Key** (veřejný, ten pošli Claudovi do webu) a **Secret Key** (tajný, jen do Workeru).
2. **Workers & Pages** → Create → Worker → název `shotc-newsletter` → Deploy →
   Edit code → nahradit obsahem `worker/newsletter.js` → Deploy.
3. Worker → **Settings → Variables and Secrets**:
   | název | typ | hodnota |
   |---|---|---|
   | `SENDER_API_KEY` | Secret | token ze Senderu |
   | `TURNSTILE_SECRET` | Secret | Secret Key z Turnstile |
   | `SENDER_GROUP_ID` | Text | ID skupiny `Newsletter – čeká na potvrzení` |
   | `ALLOWED_ORIGINS` | Text | `https://www.shot-c.cz,https://shot-c.cz` |
4. Adresu Workeru (`https://shotc-newsletter.<účet>.workers.dev`) a **Site Key** pošli Claudovi.
   Doplní je do `novy-web/assets/js/main.js` → `NEWSLETTER`. Do té doby web místo formuláře ukazuje náhradní text.

Volitelně: nasazení přes `npx wrangler deploy` ve složce `worker/` zapne i limit
3 pokusy za minutu z jedné IP (`[[ratelimits]]` ve `wrangler.toml`). Při vložení kódu
přes dashboard limit neběží; ochranu proti robotům i tak zajišťuje Turnstile.

### C. Po spuštění vyzkoušet
1. Přihlásit vlastní e-mail → přijde potvrzovací e-mail → po kliknutí je v `Newsletter`.
2. Přihlásit adresu, která se dřív **odhlásila**, a ověřit, že ji Sender znovu neaktivuje
   bez potvrzení.

## Co Worker kontroluje
- požadavek jen `POST` z `ALLOWED_ORIGINS`, tělo max. 4 kB, platný JSON objekt,
- platné ověření Turnstile (jinak 403), volitelně limit pokusů z jedné IP (429),
- e-mail (formát, délka), jméno (max. 50 znaků, bez odkazů a HTML), zaškrtnutý souhlas,
- skryté pole `hp_field` jako past na roboty,
- do logu jde jen stavový kód Senderu, žádné osobní údaje; odpověď neprozradí, zda už adresa odebírá.

## K dořešení (GDPR)
Web zatím nemá stránku se zásadami ochrany osobních údajů. Měla by uvést, že e-mail
a jméno zpracovává Shot-C kvůli zasílání novinek, a jako zpracovatele Sender a Cloudflare.
Důkazem souhlasu je potvrzovací klik v Senderu (Sender u odběratele eviduje datum přihlášení).
