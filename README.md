# Shot-C

Web vokální skupiny Shot-C k albu **Originalno**, https://shot-c.cz/.
Jednostránkový web, čisté HTML, CSS a JS bez frameworku a bez build kroku. Hostuje se na GitHub Pages.

Do 11/2026 byl v kořeni starý web (statická kopie WordPressu) a nový web žil v `/novy-web/`. Starý web je smazaný (najdete ho v historii gitu a ve větvi `stary-web-staticky`), nový web je v kořeni.

## Spuštění lokálně

`fetch` dat (`data/*.json`) nefunguje z `file://`, proto přes lokální server:

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

Testy (bez závislostí):

```bash
for t in tests/*.test.js; do node "$t"; done
```

## Co kde upravit

| Co | Kde |
|---|---|
| Odkaz na sbírku na Doniu | `data/donio.json`, pole `url`. Částku, cíl a konec doplní při nasazení `scripts/donio.js` |
| Záložní čísla, když `donio.json` ještě nemá data | `assets/js/main.js`, objekt `CAMPAIGN` nahoře |
| Barvy webu: přechod #ffb000 → #ec001d (tlačítka, akcenty, pruhy) | `assets/css/style.css`, `:root` (`--yellow`, `--red`, `--c1` až `--c6` jsou kroky přechodu) |
| Úvodní grafika (logo a Originalno jsou v obrázku, texty jsou HTML) | `assets/img/hero/hero-desktop.jpg` (1920×1080) + `hero-desktop-4k.jpg` (velké a retina monitory), `hero-mobile.jpg` (1080×1920), ikony sítí `icon-*.png`; pozice textů v `style.css`, sekce HERO |
| Koncerty | `data/events.json` (záloha, při nasazení se přepíše z Google Kalendáře, viz níže) |
| Videa | `data/videos.json` (záloha, při nasazení se stáhne z YouTube) |
| Soubory ke stažení (rider, press kit) | `assets/files/` + sekce `#ke-stazeni` v `index.html` |
| Animace | `assets/css/animations.css`, `assets/js/animations.js` |
| Stránka pro neexistující adresy | `404.html` (cesty od kořene domény) |

## Struktura

| Cesta | Obsah |
|---|---|
| `index.html` | Celý web, sekce `#koncerty`, `#hudba`, `#videa`, `#o-nas`, `#ke-stazeni`, `#newsletter`, `#kontakt` |
| `assets/` | CSS, JS, obrázky, soubory ke stažení |
| `data/` | `events.json`, `videos.json`, `donio.json` |
| `404.html` | Chybějící adresa. Staré adresy přesměruje: `/novy-web/…` → stejná cesta od kořene, `/koncerty/…` a `/events/…` → `/#koncerty` |
| `koncerty/index.html`, `novy-web/index.html` | Přesměrování ze starých adres (`/koncerty/` → `/#koncerty`, `/novy-web/` → `/`) |
| `scripts/` | Skripty spouštěné při nasazení (kalendář, Donio, YouTube) |
| `tests/` | Node testy; `tests/lib/events.js` je logika koncertů ze starého webu, slouží jako validátor `data/events.json` |
| `docs/import/` | Archiv ze starého WordPressu (akce, 25 příspěvků blogu 2019–2020), nenasazuje se |
| `.nojekyll`, `robots.txt`, `CNAME` | Pro GitHub Pages / roboty (doména `shot-c.cz`) |

Kotvy starého webu (`#events`, `#album`, `#bio`, `#contact`) se v `index.html` přepíšou na nové sekce, aby staré odkazy vedly na správné místo.

## Formát koncertu

Objekt v poli `data/events.json` (pořadí nehraje roli):

```json
{
  "id": "2027-03-20-brno-priklad",
  "start": "2027-03-20T19:00:00+01:00",
  "end": "2027-03-20T20:30:00+01:00",
  "title": "Brno – Sál U Příkladu",
  "venue": "Sál U Příkladu, Příkladová 1, Brno",
  "url": "https://example.com/vstupenky"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `id` | ano | Stabilní jedinečný řetězec (doporučeno `RRRR-MM-DD-misto`). |
| `start` | ano | ISO 8601 **s offsetem**: `+01:00` v zimě (CET), `+02:00` v létě (CEST). |
| `end` | ne | ISO 8601 s offsetem. Když chybí, počítá se začátek + 2 h. |
| `title` / `city` | aspoň jedno | Název akce / město. |
| `venue` | ne | Místo konání. |
| `url` | ne | Odkaz na událost nebo vstupenky (jen `http(s)`). |
| `allDay` | ne | `true` = celodenní akce, čas se nezobrazuje. |

Na webu jsou jen nadcházející a probíhající koncerty. Akce se slovem „soukromá“ se nezobrazí.

## Nasazení

GitHub Pages přes GitHub Actions (`.github/workflows/nasazeni.yml`, *Settings → Pages → Source: GitHub Actions*), vlastní doména `shot-c.cz` (soubor `CNAME` zůstává pro jistotu). Běží po každém merge do `main`, každou hodinu a ručně (*Actions → Nasazení webu → Run workflow*).

Data se stáhnou **jen do nasazované kopie webu**, do repozitáře se nic necommituje (pravidlo „do `main` jen přes PR“ platí dál). Soubory v `data/` jsou záloha pro případ, že stažení selže.

- **Koncerty z kalendáře:** tajná iCal adresa je v secretu `CALENDAR_ICS_URL`. Na web se nedostanou akce zrušené, soukromé (*Soukromé* / *Private*) a ty, jejichž název začíná `#`. Starší koncerty, které v kalendáři nejsou, zůstávají v archivu. Logika `scripts/sync-calendar.js`, testy `tests/sync-calendar.test.js`.
- **Donio:** `scripts/donio.js` stáhne stav sbírky do `data/donio.json`.
- **Videa:** `scripts/youtube.js` stáhne ze záložky Videa kanálu YouTube (záložně z RSS) poslední 3 videa bez Shorts do `data/videos.json`. Když selže, zůstanou dlaždice s odkazem na kanál.
- `?v=dev` u CSS/JS v `index.html` se při nasazení nahradí commitem, aby prohlížeče nebraly staré soubory z cache.
- Nenasazuje se: `.github`, `scripts`, `tests`, `docs`, `README.md`, `.gitignore`.
