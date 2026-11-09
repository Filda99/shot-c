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
| Odkaz na sbírku na Doniu | `data/donio.json`, pole `url`. Částku, cíl a konec pak každé 3 hodiny doplňuje GitHub Action `Stav sbírky z Donia` (`.github/workflows/donio.yml`, skript `scripts/donio.js`) |
| Záložní čísla, když `donio.json` ještě nemá data | `assets/js/main.js`, objekt `CAMPAIGN` nahoře |
| Barvy členů (6 barev) a přechod nápisu Originalno | `assets/css/style.css`, `:root` |
| Koncerty | `data/events.json` (stejný formát jako na starém webu) |
| Soubory ke stažení | `assets/files/` + sekce `#ke-stazeni` v `index.html` |

## Placeholdery, které čekají na grafiku

- hero: barevné „postavy“ místo fotky z obalu,
- fotky členů (barevné karty s nápisem „foto“),
- obal Originalno a Multipotenciál,
- video z YouTube,
- fotky do tisku, logo, obal alba a text o kapele ke stažení (zatím neaktivní).
