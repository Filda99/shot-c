# Poznámky k importu starého webu (https://www.shot-c.cz/)

Stav k 2026-11-02. Obsah byl získán výhradně přes WebFetch (shrnující model, ne surové HTML), proto jsou níže vyznačeny nejistoty. Obrázky ani PDF nešlo stáhnout.

## (a) Inventář stránek a odkazů

### Stránky

| Původní URL | V repu | Poznámka |
|---|---|---|
| `/` | `index.html` | Jednostránkový web, kotvy `#album`, `#events`, `#bio`, `#contact` |
| `/koncerty` | `koncerty/index.html` | Na originále kalendář (Events Manager); zde jen výpis |
| `/events/<slug>/` (jednotlivé koncerty) | nepřenášeno | Detail události obsahuje jen nadpis (a u Opavy odkaz na Facebook událost), žádné datum |
| nové | `404.html` | Na originále nezjištěno |

Nepodařilo se ověřit (WebFetch odmítl URL mimo povolený seznam): `/wp-sitemap.xml`, `/sitemap.xml`, `/robots.txt`, `/feed/`, `/events/`. Žádná stránka ochrany osobních údajů, cookies ani jiná podstránka se v menu ani patičce neobjevila.

### Odkazy

| Text odkazu | Cíl | Kde |
|---|---|---|
| Logo | `./` (původně `https://www.shot-c.cz/`) | hlavička |
| Album / Akce / O nás / Sledujte nás / Kontakt | `#album` / `#events` / `#bio` / `#contact` / `#contact` | hlavička (menu) |
| Předchozí koncerty | `koncerty/` (původně `/koncerty`) | `#events` |
| Záznam z vysílání televize A11 (1:23:59) | https://tv.a11.cz/video/21622-miroslav-dvorak-pavel-bursik-kapela-shot-c/ | Nejnovější záznamy |
| Záznam z vysílání rádia ČR Brno | https://brno.rozhlas.cz/jejich-hudba-je-tvorena-lidskymi-hlasy-brnenska-skupina-shot-c-o-vokalni-9437942 | Nejnovější záznamy |
| Spotify | https://open.spotify.com/album/1ZzoX03czOYonL08fPU2iG?si=iO49YvCSSW6GAtT6gYm_jw | `#album` |
| Apple music | https://music.apple.com/cz/album/multipotenci%C3%A1l/1556291117 | `#album` |
| Google Play Music | https://music.youtube.com/playlist?list=OLAK5uy_mW4rZAc2PUHHcQGYXWyt-B1xyLEvFyDtU (YouTube Music) | `#album` |
| Facebook | https://www.facebook.com/czshotc/ | Sledujte nás |
| Instagram | https://www.instagram.com/shotc.band | Sledujte nás |
| Youtube | https://youtube.com/c/ShotCVocalBand | Sledujte nás |
| Technický rider | `assets/files/Shot-C-techrider-2023.pdf` (původně `/wp-content/uploads/2023/09/Shot-C-techrider-2023.pdf`) | Ke stažení |
| +420 608 511 002 | `tel:+420608511002` (nově) | Pro pořadatele |
| shotc.band@gmail.com | `mailto:shotc.band@gmail.com` (nově) | Pro pořadatele |
| Facebook, Instagram, YouTube, e-mail | stejné cíle | hláška při chybě načtení koncertů a `<noscript>` |

Metadata originálu: hlavní stránka `title` „Vokální skupina SHOT-C“, description „Vokální skupina Shot-C z Brna. Pět zpěváků, jeden beatboxer. Koncerty, hudba, novinky.“ (WebFetch uvedl text jako možná zkrácený), `og:site_name` „Shot-C Vocal Band“, `og:locale` cs_CZ, `og:type` website, `og:image` = `cropped-cropped-DSC_1271-scaled-4.jpg`. `/koncerty` měl title „Proběhlé koncerty vokální skupiny Shot-C“ a description „Koncerty vokální skupiny Shot-C, seznam koncertů s možností sledovat, kde se kapela objeví“. Generátor: Elementor 4.3.5. Favicon z `<head>` se nepodařilo přečíst; jako ikona je použit `cropped-SHOT-C-color1-270x270.png` (msapplication-TileImage).

Texty: „Něco málo o nás“ (6 odstavců), názvy sekcí, role členů a texty tlačítek byly přepsány podle WebFetch (u „Něco málo o nás“ dvěma dotazy shodně).

## (b) Potřebné soubory (původní URL → cesta v repu)

Základ všech URL: `https://www.shot-c.cz/wp-content/uploads/`. Zatím ŽÁDNÝ soubor v repu není (jen `.gitkeep`), všechny CHYBÍ.

| Původní URL (relativně) | Cesta v repu | Použití | Jistota názvu |
|---|---|---|---|
| `2020/01/SHOT-C-crop1.png` | `assets/img/SHOT-C-crop1.png` | logo v hlavičce | jistá |
| `2020/01/cropped-SHOT-C-color1-270x270.png` | `assets/img/cropped-SHOT-C-color1-270x270.png` | favicon + apple-touch-icon | jistá (z msapplication-TileImage); samotný favicon na originále neověřen |
| `elementor/thumbs/LBL_2894-scaled-puvzwh2umjp1pl90kyo6loh69idr2ubxq4yhpeyh5k.jpg` | `assets/img/LBL_2894-scaled-puvzwh2umjp1pl90kyo6loh69idr2ubxq4yhpeyh5k.jpg` | úvodní fotka (hero) | jistá (jde o miniaturu Elementoru; lepší je dodat původní `LBL_2894-scaled.jpg` a přepsat cestu v `index.html`) |
| `2020/09/cropped-cropped-DSC_1271-scaled-4.jpg` | `assets/img/cropped-cropped-DSC_1271-scaled-4.jpg` | og:image/twitter:image + 2. snímek pásu fotek | jistá |
| `2020/09/DSC_1256_ed-scaled.jpg` | `assets/img/DSC_1256_ed-scaled.jpg` | „Shot-C v pohodě“ (O nás) | jistá |
| `2020/09/DSC_0286-1-01-1024x683.jpeg` | `assets/img/DSC_0286-1-01-1024x683.jpeg` | Jiří Pavlačka | jistá |
| `2020/09/DSC_0139-1024x683.jpg` | `assets/img/DSC_0139-1024x683.jpg` | Filip Jahn | jistá |
| `2020/09/DSC_0115-1024x683.jpg` | `assets/img/DSC_0115-1024x683.jpg` | Patrik Šudák | jistá |
| `2020/09/DSC_0059-1024x683.jpg` | `assets/img/DSC_0059-1024x683.jpg` | Dalibor Hradský | jistá |
| `2020/09/DSC_00032-683x1024.jpg` | `assets/img/DSC_00032-683x1024.jpg` | Tomáš Pizúr | jistá |
| `2020/09/DSC_0231-683x1024.jpg` | `assets/img/DSC_0231-683x1024.jpg` | Andrea Simba Hradská | jistá |
| neznámá cesta, „LBL_2799“ | `assets/img/LBL_2799.jpg` | pás fotek, 1. | JEN ODHAD přípony a názvu (WebFetch uvedl jen „LBL_2799“) |
| neznámá cesta, „LBL_2756“ | `assets/img/LBL_2756.jpg` | pás fotek, 3. | odhad |
| neznámá cesta, „2J1A9259“ | `assets/img/2J1A9259.jpg` | pás fotek, 4. | odhad |
| neznámá cesta, „DSC_4160“ | `assets/img/DSC_4160.jpg` | pás fotek, 5. | odhad |
| neznámá cesta, „LBL_2832“ | `assets/img/LBL_2832.jpg` | pás fotek, 6. | odhad |
| neznámá cesta, „DSC_0902“ | `assets/img/DSC_0902.jpg` | pás fotek, 7. | odhad |
| `2023/09/Shot-C-techrider-2023.pdf` | `assets/files/Shot-C-techrider-2023.pdf` | Ke stažení | jistá |

Další soubor zmíněný v metadatech `/koncerty` (`2020/01/SHOT-C-color1.png`, 3841×3841) se nepoužívá.

Až budou soubory k dispozici, zkontrolujte přesné názvy a přípony šesti „odhadnutých“ fotek a případně upravte `src` v `index.html`.

## (c) Úmyslné rozdíly proti živému webu

- Vyhledávací pole (WordPress) a odkaz „Skip to content“ v angličtině: vyhledávání vynecháno, „Přeskočit na obsah“ česky.
- Přidány `mailto:` a `tel:` odkazy (na originále je e-mail i telefon jen text).
- Odkaz „Předchozí koncerty“ a menu jsou relativní (originál absolutní URL).
- `/koncerty`: místo kalendáře výpis po letech; title změněn na „Koncerty vokální skupiny Shot-C“ (původně „Proběhlé…“, ale výpis nyní obsahuje i budoucí koncerty); doplněn nadpis „Koncerty“ a odkaz zpět.
- Koncerty se berou z `data/events.json`, ne z WordPressu. Detailní stránky událostí (`/events/...`) nejsou, karty na ně neodkazují.
- Odstraněny WordPress/Elementor/Events Manager prvky, odkaz „wp-events-plugin.com“ v patičce, kalendář, skripty a CSS šablony.
- Nadpisy sekcí jsou psány běžnou velikostí písmen („Album“, „Kde budeme hrát“…); originál je podle WebFetch psal malými písmeny (jména členů např. „tomáš pizúr (TOMI P)“). Nejspíš jde o CSS transformaci, nepotvrzeno. Jména jsou zde ve správné podobě.
- Role Tomáše Pizúra je „Bass“ (podle WebFetch na živém webu; zadání uvádělo „Bas“).
- Alt texty: originál měl např. „Jirka“, „Filip“, „Patrik“, „Tomi“, „Simba“; zde „Jméno – role“.
- Pás sedmi fotek mezi Album a O nás je moje interpretace řádků s názvy souborů, které WebFetch uvedl (stránka je neoznačila jako galerii). Realizováno jako vodorovně posuvný pás bez JS.
- Ikony sociálních sítí jsou jednoduché vlastní inline SVG, ne originální.
- Přidány: `<noscript>` text, hláška při selhání načtení, stav „Právě probíhá“/„Proběhlo“, 404 stránka.
- Vzhled (barvy, písma, rozložení) je neutrální tmavý návrh bez znalosti originálu; přesná vizuální shoda čeká na screenshoty od uživatele. Logo je na bílém pruhu hlavičky, protože jeho barvy nejsou známy; ověřte po dodání souboru.
- Nenačítají se žádné externí fonty, skripty ani analytika.
- Chybí `<link rel="canonical">`, `og:url` a absolutní `og:image` (doména zatím neznámá). `og:image` je zatím lokální cesta.

## (d) Importované koncerty a úplnost

V `data/events.json` je **5 koncertů** s ověřeným datem. Výpis NENÍ úplný.

| Datum | Místo | Čas | Zdroj |
|---|---|---|---|
| 2026-12-19 | Blansko | 15:30–16:30 | hlavní stránka + kalendář 12/2026 |
| 2026-12-05 | Jedovnice | 16:00–17:00 | hlavní stránka + kalendář 12/2026 |
| 2026-11-15 | Praha, koncert s a cappellou Intonic | 17:00–18:00 | hlavní stránka + kalendář 11/2026 |
| 2026-09-18 | Kuřim, OSLAVY 800 LET KUŘIMI | celý den (v kalendáři „All Day“) | kalendář 9/2026 |
| 2026-09-11 | Brno, festival Ruku v ruce, Moravské nám. | celý den | kalendář 9/2026 |

Kalendář `/koncerty` je měsíční mřížka; WebFetch uspěl jen pro měsíce 9, 10 (prázdný), 11 a 12 / 2026. Starší měsíce (`?mo=8&yr=2026` a dál) vracely opakovaně obsah listopadu, takže je nešlo číst. Proto jsem názvy starších událostí dohledal procházením navigačních odkazů mezi stránkami `/events/<slug>/` (řazeno podle data publikace příspěvku, ne podle data koncertu). Tyto události existují na originále, ale JEJICH DATUM ANI ČAS SE NEPODAŘILO ZJISTIT (detail události obsahuje jen nadpis), proto nejsou v `events.json`:

| Název na originále | Slug | Publikováno (UTC) |
|---|---|---|
| Soukromá akce | `soukroma-akce-2` | 2026-04-26 |
| Kuřim – Sportovec roku | `kurim-sportovec-roku` | 2026-04-26 |
| Poslech Brno | `poslech-brno` | 2026-03-23 |
| Pohořelice | `pohorelice` | 2026-03-23 |
| Opava (odkaz na Facebook událost 1208305284800661) | `opava` | 2026-03-23 |
| Nepomyšl | `nepomysl` | 2026-02-01 |
| Hudba na kolech | `hudba-na-kolech` | 2026-02-01 |
| Praha s acappellou Choirizzo | `praha-s-acappellou-choirizzo` | 2025-12-07 |
| „/firemní akce/“ | `2718` | neověřeno |

Řetěz pokračuje dál do minulosti (nebyl dokončen). Pro doplnění je potřeba export z WordPressu (Nástroje, Export, Události) nebo FTP/DB záloha. Do `events.json` pak stačí přidat objekty podle schématu v `README.md`.

Koncert se začátkem 5. 12. a Blansko jsou v zimním čase (+01:00), události z 9/2026 v letním (+02:00).

## (e) Otevřené otázky a nejistoty

- Úplný seznam koncertů včetně dat (viz výše).
- WebFetch vrací shrnutí malým modelem: texty jsem ověřoval opakovanými dotazy (O nás, role, kontakty se shodovaly), ale interpunkce a mezery nemusí být zcela doslovné. Doporučuji porovnat s uloženým HTML.
- Přesné pořadí a struktura sekcí vychází z pořadí nadpisů (originál nemá id sekcí podle WebFetch); kotva `#contact` je na bloku „Sledujte nás / Ke stažení / Pro pořadatele“.
- Co jsou řádky „LBL_2799… DSC_0902“ (galerie, slider, pozadí?) a jejich skutečné soubory.
- Zda má originál `<link rel="icon">` a jaký (nebylo v dostupném obsahu), theme-color, JSON-LD.
- Meta description hlavní stránky mohla být zkrácena.
- Barvy, písma a rozložení originálu (čeká na screenshoty).
- Zda se u koncertů na originále zobrazuje i popis (na hlavní stránce jen Praha „koncert s a cappellou Intonic“) nebo odkazy na detail.
- Cílová doména (apex vs. www): doplnit `CNAME`, `canonical`, absolutní `og:*`, případně `Sitemap:`.
- Bylo zjištěno, že e-mail na webu je zatím `shotc.band@gmail.com`; po přechodu na adresu @shot-c.cz ho stačí změnit v `index.html` a `koncerty/index.html` (noscript).
