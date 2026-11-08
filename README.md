# Shot-C

Statická verze webu vokální skupiny Shot-C (původně WordPress + Elementor, https://www.shot-c.cz/).
Čisté HTML, CSS a vanilla JS, žádný framework ani build krok. Jde hostovat přímo z kořene větve na GitHub Pages.

## Spuštění lokálně

Načítání `data/events.json` přes `fetch` nefunguje z `file://`, proto web spouštějte přes lokální server:

```bash
python3 -m http.server 8000
# otevřete http://localhost:8000/
```

Testy (bez závislostí):

```bash
node tests/events.test.js
```

## Struktura

| Cesta | Obsah |
|---|---|
| `index.html` | Hlavní (jednostránkový) web, kotvy `#events`, `#album`, `#bio`, `#contact` |
| `koncerty/index.html` | Výpis všech koncertů (od nejnovějších po nejstarší) |
| `404.html` | Stránka pro neexistující adresy (používá absolutní cesty od kořene domény) |
| `assets/css/style.css` | Styly podle původního webu (Raleway + Roboto z `assets/fonts/`, žádné externí zdroje) |
| `assets/js/events.js` | Logika koncertů (čisté funkce + vykreslení) |
| `assets/js/nav.js` | Mobilní menu |
| `assets/img/`, `assets/files/`, `assets/fonts/` | Obrázky, ikony, technický rider (PDF) a písma staženého z původního webu |
| `data/events.json` | Všechny koncerty |
| `tests/events.test.js` | Node testy logiky koncertů |
| `docs/import/IMPORT_NOTES.md` | Poznámky k importu ze starého webu |
| `docs/import/wp-events-archive.json` | Surový export 75 akcí z WordPressu (popisy, adresy) |
| `docs/import/wp-posts-archive.json` | Archiv 25 starých příspěvků blogu (2019–2020), na webu se nezobrazují |
| `.nojekyll`, `robots.txt`, `CNAME` | Pro GitHub Pages / roboty (doména `shot-c.cz`; `/novy-web/` je pro roboty zakázaný) |
| `novy-web/` | Nástřel nového webu k albu Originalno, dostupný na https://shot-c.cz/novy-web/ (samostatný, relativní cesty, vlastní kopie `data/events.json`) |

## Jak přidat koncert

Přidejte objekt do pole v `data/events.json` (pořadí v souboru nehraje roli). Koncerty se nikdy nemažou: po skončení zmizí z hlavní stránky a zůstanou na `/koncerty/`.

```json
{
  "id": "2027-03-20-brno-priklad",
  "start": "2027-03-20T19:00:00+01:00",
  "end": "2027-03-20T20:30:00+01:00",
  "title": "Brno – Sál U Příkladu",
  "venue": "Sál U Příkladu, Příkladová 1, Brno",
  "note": "Volitelný popis",
  "url": "https://example.com/vstupenky"
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `id` | ano | Stabilní jedinečný řetězec (doporučeno `RRRR-MM-DD-misto`). |
| `start` | ano | ISO 8601 **s offsetem**: `+01:00` v zimě (CET), `+02:00` v létě (CEST). Letní čas začíná poslední neděli v březnu a končí poslední neděli v říjnu. |
| `end` | ne | ISO 8601 s offsetem. Pokud chybí, počítá se konec = začátek + 2 h (u celodenní akce + 24 h) a na webu se zobrazí jen čas začátku. |
| `title` | ano* | Název akce, hlavní (žlutý) nadpis karty, např. „Praha – koncert s a cappellou Intonic“. |
| `city` | ano* | Město; použije se jako nadpis, když chybí `title`, jinak jako doplňující řádek. *Povinné je aspoň jedno z `title`/`city`. |
| `venue` | ne | Místo konání (samostatný řádek pod datem). |
| `note` | ne | Doplňující text/popis. |
| `url` | ne | Odkaz na událost nebo vstupenky (jen `http(s)`), zobrazí se jako „Více informací“. |
| `allDay` | ne | `true` = celodenní akce, čas se nezobrazuje („celý den“). Doporučeno zadat `start` v 00:00:00 a `end` v 23:59:59. |

Pravidla zobrazení:

- Hlavní stránka (`#events`): jen koncerty s `end >= teď` (budoucí a právě probíhající), vzestupně podle `start`. Když žádný není, zobrazí se „Další koncerty právě chystáme, sledujte nás.“
- `/koncerty/`: všechny koncerty sestupně podle `start`, seskupené po letech (podle času v Praze), nadcházející a probíhající jsou zvýrazněné, proběhlé ztlumené a označené „Proběhlo“.
- Čas se vždy formátuje v `Europe/Prague` (`Intl.DateTimeFormat`, `cs-CZ`), bez ohledu na časové pásmo prohlížeče.
- Neplatné záznamy se přeskočí a vypíšou varování do konzole; stránka se nerozbije. Nenačte-li se `events.json`, zobrazí se hláška s odkazy na sociální sítě.

### Testování času

Na stránce lze "nastavit hodiny": `/?now=2026-11-15T17:30:00+01:00` (nebo `window.__NOW__ = '2026-11-15T17:30:00+01:00'` před načtením `events.js`). Hodnota musí obsahovat offset.

## Nasazení

GitHub Pages z větve `main`, složka `/ (root)`, vlastní doména `shot-c.cz` (soubor `CNAME`).

- Starý web: https://shot-c.cz/
- Nový web (nástřel): https://shot-c.cz/novy-web/ (má `noindex`, aby ho vyhledávače zatím neindexovaly)

Koncerty jsou zatím ve dvou kopiích (`data/events.json` a `novy-web/data/events.json`). Až nový web nahradí starý, přesune se obsah `novy-web/` do kořene.
