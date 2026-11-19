# Newsletter: Cloudflare Worker → Sender

Formulář v sekci Novinky na novém webu posílá e-mail a jméno sem. Worker je ověří
a přes oficiální API předá do Senderu. API klíč Senderu je jen v Cloudflare
(tajná proměnná), nikdy ve webu ani v tomhle repu. Na web se tahle složka nenasazuje.

## 1. Sender

1. **Skupiny**: v Subscribers → Groups založ dvě skupiny:
   - `Newsletter – čeká na potvrzení` (sem Worker přidává nové přihlášky),
   - `Newsletter` (sem se přesunou ti, kdo potvrdí e-mail).
   ID skupiny je v adrese po kliknutí na skupinu (krátký kód, např. `eZVD4w`).
2. **Double opt-in** (Sender ho u API dělá automatizací, viz
   [návod Senderu](https://www.sender.net/help/automation/double-opt-in/)):
   Automation → nová → spouštěč *Subscriber is added to a group* →
   `Newsletter – čeká na potvrzení` → e-mail s tlačítkem „Potvrdit odběr“ →
   Delay (např. 2 dny) → Condition *Link is clicked* → ano: *Move subscriber to another group* → `Newsletter`.
3. **API token**: Settings → API access tokens → vytvořit. Zkopírovat (uvidíš ho jen jednou).

## 2. Cloudflare (zdarma)

1. Účet na dash.cloudflare.com → Workers & Pages → Create → Worker („Hello World“) → název `shotc-newsletter` → Deploy.
2. Edit code → celý obsah nahradit souborem `worker/newsletter.js` → Deploy.
3. Settings → Variables and Secrets:
   - `SENDER_API_KEY` = token ze Senderu, typ **Secret**,
   - `SENDER_GROUP_ID` = ID skupiny `Newsletter – čeká na potvrzení`, typ Text,
   - `ALLOWED_ORIGINS` = `https://www.shot-c.cz,https://shot-c.cz` (Text).
4. Zkopírovat adresu Workeru (`https://shotc-newsletter.<účet>.workers.dev`) a doplnit ji do
   `novy-web/assets/js/main.js` → `NEWSLETTER.endpoint`. Do té doby web místo formuláře ukazuje náhradní text.

## Co Worker dělá

- přijímá jen `POST` z adres v `ALLOWED_ORIGINS` (CORS), ostatní odmítne,
- ověří e-mail a zaškrtnutý souhlas, skryté pole `web` slouží jako past na roboty,
- volá `POST https://api.sender.net/v2/subscribers` s `groups: [SENDER_GROUP_ID]`
  a `trigger_automation: true` (spustí double opt-in automatizaci),
- už existující odběratel je pro návštěvníka úspěch, chyby Senderu se jen zalogují (Cloudflare → Logs).
