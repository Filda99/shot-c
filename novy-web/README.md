# Shot-C | Originalno (nový web, nástřel)

Jednostránkový web vokální skupiny Shot-C k novému albu **Originalno**. Nezávislý na starém webu (větev `stary-web-staticky`), čisté HTML, CSS a JS bez build kroku, připravené pro GitHub Pages.

## Spuštění

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

## Co kde upravit

| Co | Kde |
|---|---|
| Odkaz na sbírku na Doniu | `data/donio.json`, pole `url`. Částku, cíl a konec doplní skript `scripts/donio.js` při každém nasazení webu (společný deploy workflow s kalendářem) |
| Záložní čísla, když `donio.json` ještě nemá data | `assets/js/main.js`, objekt `CAMPAIGN` nahoře |
| Barvy webu: přechod #ffb000 → #ec001d (tlačítka, akcenty, pruhy) | `assets/css/style.css`, `:root` (`--yellow`, `--red`, `--c1` až `--c6` jsou kroky přechodu) |
| Úvodní grafika (logo a Originalno jsou v obrázku, texty jsou HTML) | `assets/img/hero/hero-desktop.jpg` (1920×1080) + `hero-desktop-4k.jpg` (4000×2250 pro velké a retina monitory), `hero-mobile.jpg` (1080×1920), ikony sítí `icon-*.png`; pozice textů v `style.css`, sekce HERO |
| Koncerty | `data/events.json` (stejný formát jako na starém webu). Místo konání se bere z pole Místo v Google Kalendáři, akce se slovem „soukromá“ se na webu nezobrazí |
| Soubory ke stažení | `assets/files/` + sekce `#ke-stazeni` v `index.html` |

## Placeholdery, které čekají na grafiku



- video z YouTube,
- press kit ke stažení (zip: logo, fotky do tisku, text o kapele), zatím neaktivní.
