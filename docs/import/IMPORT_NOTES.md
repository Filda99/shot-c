# Poznámky k importu starého webu (https://www.shot-c.cz/)

Stav k 2026-11-02 (krok B + kontrola úplnosti C). Vše ověřeno ze **surového HTML** (curl), z WordPress REST API, sitemap a ICS exportu Events Manageru a porovnáním screenshotů (Playwright, šířka 390 a 1280 px). Předchozí verze poznámek vycházela jen ze shrnutí (WebFetch) a měla několik nejistot, ty jsou níže vyřešené.

## (a) Stránky a odkazy

| Původní URL | V repu | Poznámka |
|---|---|---|
| `/` | `index.html` | Kotvy `#events`, `#album`, `#bio`, `#contact` existují i na originále (ověřeno v HTML). Pořadí sekcí: hero, Kde budeme hrát, Nejnovější záznamy, Album, karusel fotek, O nás + členové, Sledujte nás / Ke stažení / Pro pořadatele, patička. |
| `/koncerty` | `koncerty/index.html` | Originál: nadpis „Seznam veškerých odehraných koncertů“ + kalendář Events Manageru. Zde výpis všech 75 akcí po letech. |
| `/events/<slug>/` (75 detailů) | nepřenášeno | Detaily obsahovaly jen název, datum, místo a případně popis; data jsou v `data/events.json`, surové popisy v `wp-events-archive.json`. |
| `/locations/`, `/category/uncategorized/` | nepřenášeno | Automatické stránky pluginů. |
| 25 příspěvků blogu (2019–2020) | nepřenášeno, archiv v `wp-posts-archive.json` | Na starém webu nebyly v menu ani na hlavní stránce, dostupné jen přímým odkazem / ze sitemapy. Obrázky z nich (44 souborů) jsou jen ve FTP záloze. |
| nové | `404.html` | |

Všechny externí odkazy z hlavní stránky originálu (Spotify, Apple Music, YouTube Music, A11, ČRo Brno, Facebook, Instagram, YouTube, e-mail) jsou v novém webu se stejným cílem (ověřeno skriptem).

Ověřené věci, které byly dřív nejisté:

- Role Tomáše Pizúra je na živém webu **„Bass“** (surové HTML).
- Tlačítko k YouTube Music má na originále opravdu popisek **„Google Play Music“**; ponecháno, čtečkám obrazovky je doplněno „(YouTube Music…)“.
- Meta description byla dřív zkrácená. Plná verze: „Vokální skupina Shot-C z Brna. Pět zpěváků, jeden beatboxer. Koncerty, hudba, novinky. Covery na známé hity i vlastní tvorba. Vokální kapela.“ (doplněno do `description`, `og:` i `twitter:`).
- Kotva `#contact` je na originále na šedém bloku „Sledujte nás / Ke stažení / Pro pořadatele“, stejně jako zde.
- Text „Něco málo o nás“ je na originále jeden odstavec se zalomeními (`<br>`), ne šest odstavců; převzato doslova.
- Favicon: originál má `cropped-SHOT-C-color1-32x32.png`, `-192x192.png` a apple-touch `-180x180.png`; převzato.
- Alt texty fotek členů jsou na originále „Jirka“, „Filip“, „Patrik“, „Dalibor“, „Tomi“, „Simba“; převzato.
- Odkaz „Sledujte nás“ má na originále 4 ikony: Facebook, Instagram, YouTube a e-mail (ikona Gmailu, `mailto:`). Ikony (SVG) jsou převzaté z originálu.
- Fotka „Shot-C v pohodě“ na originále odkazuje na plnou velikost; zachováno.

## (b) Soubory (původní URL → repo)

Základ: `https://www.shot-c.cz/wp-content/uploads/`. Všechny stažené 2026-11-02, nic nechybí.

| Původní (relativně) | V repu | Použití |
|---|---|---|
| `2020/01/SHOT-C-crop1.png` | `assets/img/SHOT-C-crop1.png` | logo |
| `2020/01/cropped-SHOT-C-color1-{32x32,192x192,180x180}.png` | `assets/img/…` | favicon, apple-touch-icon |
| `elementor/thumbs/LBL_2894-scaled-puvzwh2umjp1pl90kyo6loh69idr2ubxq4yhpeyh5k.jpg` | `assets/img/…` | úvodní fotka |
| `2020/09/cropped-cropped-DSC_1271-scaled-4.jpg` | `assets/img/…` | `og:image` |
| `2022/09/LBL_2799-1024x684.jpg` | `assets/img/…` | karusel 1 |
| `2020/09/cropped-cropped-DSC_1271-scaled-4-1024x575.jpg` | `assets/img/…` | karusel 2 |
| `2022/09/LBL_2756-1024x684.jpg` | `assets/img/…` | karusel 3 |
| `2019/12/2J1A9259-1-1024x683.jpg` | `assets/img/…` | karusel 4 |
| `2020/11/DSC_4160-1024x684.jpg` | `assets/img/…` | karusel 5 |
| `2022/09/LBL_2832-1024x684.jpg` | `assets/img/…` | karusel 6 |
| `2020/11/DSC_0902-1024x684.jpg` | `assets/img/…` | karusel 7 |
| `2020/09/DSC_1256_ed-scaled.jpg` + `-1024x683.jpg` | `assets/img/…` | „Shot-C v pohodě“ (náhled 1024, odkaz na plnou) |
| `2020/09/DSC_0286-1-01-1024x683.jpeg`, `DSC_0139-1024x683.jpg`, `DSC_0115-1024x683.jpg`, `DSC_0059-1024x683.jpg`, `DSC_00032-683x1024.jpg`, `DSC_0231-683x1024.jpg` | `assets/img/…` | členové (Jiří, Filip, Patrik, Dalibor, Tomáš, Andrea) |
| `2023/09/Shot-C-techrider-2023.pdf` | `assets/files/…` | Technický rider (8 stran) |
| `elementor/google-fonts/fonts/raleway-*.woff2`, `roboto-*.woff2` (latin, latin-ext) | `assets/fonts/` | písma Raleway a Roboto (OFL / Apache 2.0) |

Šest fotek, jejichž názvy byly dřív jen odhadnuté, jsou snímky Elementor karuselu (ne galerie); skutečné cesty jsou výše.

## (c) Koncerty

Zdroj: sitemap `event-sitemap.xml` (75 akcí) a ICS export každé akce (`/events/<slug>/ical/`). Všech **75 akcí z let 2022–2026** je v `data/events.json`, žádná nechybí (ověřeno skriptem proti sitemapě). REST API Events Manageru vyžaduje přihlášení (401), proto ICS.

Převod:

- `title` = název akce z WordPressu doslova, jen „ - “ nahrazeno „ – “ (WordPress to tak zobrazoval).
- `venue` = název místa z Events Manageru (první část adresy), pokud bylo vyplněné.
- `url` = první externí odkaz z popisu akce (Facebook událost, vstupenky, program); u 8 akcí.
- Celodenní akce (ICS `VALUE=DATE`) mají `allDay: true`.
- Celý popis, adresa a odkaz na původní detail každé akce jsou v `docs/import/wp-events-archive.json`.

Nejasnosti (označené, nic nevymyšleno):

- `2024-05-24-2415`: akce nemá ve WordPressu název ani místo. Zobrazuje se jako „Akce (název neuveden)“.
- `2026-01-24-praha-s-acappellou-choirizzo`: ve WordPressu začátek i konec 00:00, tj. čas nebyl zadán. Zobrazuje se jako „celý den“.
- „~ Soukromá akce ~“ (2023-12-14) a „/firemní akce/“ (2025-11-28) mají názvy převzaté doslova i se znaky.
- Popis akce 2023-10-13 („Shot-C a Intonic v Brně…“) obsahuje ve WordPressu i kus CSS kódu; v archivu je ponechán tak, jak byl.

## (d) Vzhled

Podle screenshotů a vypočtených stylů originálu:

- Hlavička černá, žlutá linka 3 px `#e8d000`, menu Roboto 500 18 px bílé.
- Nadpisy Raleway 900 velkými písmeny (64 px), podnadpisy Raleway 700 (40 px), texty Raleway 400 (32 px na desktopu), menší texty Roboto.
- Barvy: černá, bílá, šedá `#efefef` (kontakty), žlutá `#e8d000` (názvy koncertů, patička), žlutá `#eeee22` (jména členů, „Česká vokální skupina“), zelená `#1db954` (text tlačítek, ikonky seznamu), šedý text `#c3c3c3`.
- Šikmé černobílé předěly u „Kde budeme hrát“ a „Nejnovější záznamy“, tlačítka černá oválná se zelenou šipkou.
- Fotky členů černobíle (na originále stejně, CSS filtr).

## (e) Úmyslné rozdíly

- Bez vyhledávání, „Skip to content“ je česky „Přeskočit na obsah“.
- Přidány `tel:` a `mailto:` odkazy v kontaktech (originál měl e-mail odkazem jen v ikoně).
- Karusel fotek je vodorovně posuvný pás bez JavaScriptu (3 fotky na šířku jako originál), ne automatický slider.
- Animace Elementoru (fade-in) vynechány.
- Na mobilu je pořadí členů stejné jako na desktopu (originál na mobilu řadil Filip, Jiří, Dalibor, Patrik, Andrea, Tomáš, zřejmě nechtěně).
- Ikony data/času u koncertů a kalendářová ikona jsou vlastní CSS/SVG napodobeniny.
- `/koncerty`: místo měsíčního kalendáře seznam po letech; nadpis „Seznam veškerých odehraných koncertů“ jako originál, title „Koncerty vokální skupiny Shot-C“ (originál „Proběhlé koncerty…“, ale výpis obsahuje i budoucí). Description převzat z originálu.
- Proběhlé koncerty mají štítek „Proběhlo“, probíhající „Právě probíhá“.
- Bez Google Analytics / Site Kit / Jetpack a dalších skriptů.
- Chybí `canonical`, `og:url` a absolutní `og:image` (čeká se na rozhodnutí apex vs. www).

## (f) Otevřené

- Kanonická doména (apex vs. www): pak doplnit `CNAME`, `canonical`, absolutní `og:*`, `Sitemap:` v `robots.txt`.
- Zda staré příspěvky blogu (2019–2020) zveřejnit i na novém webu (archiv je připravený), nebo je nechat jen v záloze.
- E-mail na webu je zatím `shotc.band@gmail.com`; po zřízení @shot-c.cz změnit v `index.html` a `koncerty/index.html`.
