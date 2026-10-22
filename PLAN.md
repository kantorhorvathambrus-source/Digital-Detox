# Dopamin-detox app – fejlesztési terv (MVP)

> Munkanév: **Detox** (később átnevezhető). Ez a fájl a projekt gyökerébe kerül, Claude Code ebből dolgozik.

## 1. Mi ez az app?

Egy web app, ahol a felhasználó egy saját **detox-vállalást** köt magával, majd minden este rövid visszajelzést ad.

1. **Induláskor** kitölti a „szerződést”: miért csinálja, mi az egyetlen fókuszcélja, mitől tartja távol magát, mit tart be, és meddig.
2. **Napközben** a főképernyő emlékezteti: hányadik nap, mi a fókuszcél, mik a szabályok.
3. **Este** check-in: mennyire volt nehéz a nap (1–10), mely szabályokat tartotta be, haladt-e a fókuszcéllal, rövid jegyzet.
4. **A végén** összegzés: nehézségi görbe, betartási arány, a saját jegyzetei.

**Nem része az MVP-nek:** appblokkolás, backend, regisztráció/login, push értesítések, közösségi funkciók.

## 2. Technikai keretek (kötelező)

- Plain **HTML / CSS / vanilla JS**, build step nélkül. Nincs framework, nincs Tailwind, nincs npm-es toolchain.
- ES modules (`<script type="module">`), külső library csak akkor, ha tényleg elkerülhetetlen (előtte kérdezz).
- Adattárolás: **`localStorage`**, egyetlen kulcs alatt, verziózott JSON-ként. Minden olvasás/írás `try/catch`-ben.
- **PWA**: `manifest.webmanifest` + egyszerű `service-worker.js` (offline cache), hogy Androidon telepíthető legyen a kezdőképernyőre.
- A UI nyelve **magyar**. Minden szöveg egy helyen (`js/strings.js`), hogy később fordítható legyen.
- Deploy: Netlify, build command nélkül, publish directory = projekt gyökere. Fejlesztés alatt lokálisan: `python3 -m http.server 8000`.
- Elsődleges céleszköz: **Android telefon, Chrome**. iPhone-on nem tudok tesztelni, ezért Safari-specifikus trükköket ne használj.

## 3. Design

- Kövesd a `ui-ux-pro-max-static` skill szabályait (ha elérhető), különösen: akadálymentesség, ≥44×44 px érintési felületek, mobile-first, light + dark téma, háromrétegű CSS tokenek (primitive → semantic → component), `prefers-reduced-motion`.
- Mielőtt markupot írsz, javasolj egy design systemet (stílus, paletta light/dark, font pár), és várd meg, hogy jóváhagyom.
- Hangulat: nyugodt, támogató, nem „hustle”. Ikonok egy SVG készletből, emoji ikonként nem.
- Hangnem a szövegekben: **nem bűntudatkeltő**. Szabályszegés után nincs „elbuktál”, hanem „ez is adat, holnap folytatod”.
- Ne írj orvosi/tudományos állításokat a dopaminról (pl. „visszaállítja a dopaminszintet”). A szokásokról és figyelemről beszélj.

## 4. Fájlstruktúra

```
/
├── index.html              # app shell, egyetlen oldal
├── manifest.webmanifest
├── service-worker.js
├── netlify.toml            # csak headerek / SPA nem kell
├── css/
│   ├── tokens.css          # primitive + semantic + component tokenek, light/dark
│   └── main.css
├── js/
│   ├── app.js              # belépési pont, egyszerű hash router (#/start, #/today, #/checkin, #/history, #/summary, #/settings)
│   ├── store.js            # localStorage olvasás/írás, séma-verzió, migráció
│   ├── dates.js            # helyi dátum kezelés (YYYY-MM-DD, napszámítás)
│   ├── strings.js          # minden UI szöveg
│   └── views/              # képernyőnként egy modul
│       ├── contract.js
│       ├── today.js
│       ├── checkin.js
│       ├── history.js
│       ├── summary.js
│       └── settings.js
└── icons/                  # app ikonok (192, 512, maskable)
```

## 5. Adatmodell (localStorage kulcs: `detox.v1`)

```json
{
  "schemaVersion": 1,
  "activeChallengeId": "c_20261022_ab12",
  "challenges": [
    {
      "id": "c_20261022_ab12",
      "createdAt": "2026-10-22T07:45:00",
      "startDate": "2026-10-23",
      "durationDays": 14,
      "why": "Szeretnék újra végig tudni olvasni egy könyvet.",
      "focusGoal": "Minden nap 30 perc olvasás",
      "rules": [
        { "id": "r1", "type": "avoid", "text": "Nincs Instagram" },
        { "id": "r2", "type": "avoid", "text": "Nincs YouTube 21:00 után" },
        { "id": "r3", "type": "keep",  "text": "Telefon az ágyon kívül alszik" }
      ],
      "status": "active",
      "checkins": [
        {
          "date": "2026-10-23",
          "difficulty": 6,
          "rulesKept": { "r1": true, "r2": false, "r3": true },
          "focusProgress": "yes",
          "note": "Este volt a legnehezebb."
        }
      ]
    }
  ]
}
```

- `type`: `avoid` (mitől tartom távol magam) vagy `keep` (mit tartok be).
- `status`: `draft` | `active` | `finished` | `abandoned`.
- `focusProgress`: `yes` | `partly` | `no`.
- Egyszerre egy aktív challenge. A korábbiak megmaradnak az előzményekben.
- Dátumok mindig a **helyi** időzóna szerint (`dates.js`), ne UTC szerint, különben éjfél körül rossz napra kerül a check-in.

## 6. Képernyők és flow

### 6.1 Szerződés (`#/start`) – több lépéses wizard
1. **Miért?** – egy mondat (kötelező).
2. **Fókuszcél** – egyetlen konkrét cél erre az időszakra (kötelező).
3. **Mitől tartod távol magad?** – szabálylista, hozzáadás/törlés, legalább 1. Adj 6–8 kattintható javaslatot (közösségi média, rövid videók, játékok, hírek, nassolás, sorozat…), de saját is írható.
4. **Mit tartasz be?** – opcionális szabálylista (pl. reggel az első órában nincs telefon).
5. **Időtartam** – gyors gombok: 3 / 7 / 14 / 30 nap + egyéni szám. Kezdés: ma vagy holnap.
6. **Összefoglaló + vállalás** – minden egy kártyán, „Vállalom” gomb. Ekkor lesz `active`.

Vissza gomb minden lépésen, a beírt adat ne vesszen el (piszkozat mentése `draft`-ként).

### 6.2 Ma (`#/today`) – főképernyő
- „X. nap / Y”, haladási sáv.
- Fókuszcél kiemelve, alatta a „miért”.
- Szabályok listája (csak olvasható).
- Egy fő CTA: **„Esti check-in”** (ha a mai még nincs kitöltve), egyébként „Ma már kitöltötted ✓” + szerkesztési lehetőség.
- Ha a tegnapi check-in hiányzik: kis figyelmeztetés + lehetőség pótolni (csak az előző napot lehet pótolni).

### 6.3 Esti check-in (`#/checkin`)
- **Mennyire volt nehéz ma?** – 1–10 skála (nagy, érinthető gombok vagy slider, címkékkel: 1 = könnyű, 10 = nagyon nehéz).
- **Szabályok** – mindegyikhez „betartottam / nem” kapcsoló.
- **Fókuszcél** – igen / részben / nem.
- **Jegyzet** – opcionális, pl. „Mi volt a legnehezebb pillanat?”.
- Mentés után rövid, támogató visszajelzés; szabályszegés esetén se legyen nullázás vagy „bukás”.

### 6.4 Előzmények (`#/history`)
- Napok listája: dátum, nehézség, betartott szabályok száma, jegyzet első sora.
- Egyszerű **inline SVG vonaldiagram** a nehézségről (külső chart library nélkül).

### 6.5 Összegzés (`#/summary`)
- Akkor jelenik meg, amikor letelt az időtartam (vagy a felhasználó lezárja).
- Nehézségi görbe, átlagos nehézség az első és az utolsó harmadban, szabályonkénti betartási arány, fókuszcél-napok száma, a jegyzetek listája.
- Két gomb: „Új vállalás” és „Ugyanez még egyszer” (előtöltött szerződés).

### 6.6 Beállítások (`#/settings`)
- Téma: rendszer / világos / sötét.
- **Export** JSON fájlba és **import** JSON-ból (mivel minden csak az eszközön van, ez az egyetlen mentés).
- Aktív vállalás feladása (megerősítéssel) és minden adat törlése (kétszeres megerősítéssel).

## 7. Fejlesztési fázisok

Minden fázis külön branch + commit(ok), a végén rövid összefoglaló, mit kell kézzel kipróbálnom.

1. **Alapok** – fájlstruktúra, `tokens.css` (design system jóváhagyás után), `store.js`, `dates.js`, router, üres nézetek.
2. **Szerződés wizard** – teljes flow, piszkozat mentés, validáció (hibaüzenet a mező alatt, `aria-describedby`).
3. **Ma + esti check-in** – főképernyő, check-in mentés/szerkesztés, tegnapi pótlás.
4. **Előzmények + összegzés** – SVG diagram, statisztikák, lezárás.
5. **Beállítások + PWA** – téma, export/import, manifest, service worker, ikonok.
6. **Csiszolás és ellenőrzés** – lásd 8. pont.

## 8. Átadás előtti ellenőrzés

- 375 / 768 / 1024 / 1440 px szélesség, nincs vízszintes görgetés.
- Csak billentyűzettel végigjárható, látható `:focus-visible`.
- Kontraszt light és dark témában is ≥ 4.5:1.
- `prefers-reduced-motion` mellett nincs animáció.
- Offline is megnyílik (service worker), Androidon telepíthető.
- `localStorage` sérült vagy üres adat esetén sem omlik össze (alapállapotot mutat).
- Éjfél körüli check-in a helyes napra kerül.

## 9. Később (nem MVP)

- Emlékeztető értesítés esténként.
- Több nyelv (angol, német).
- Böngészőbővítmény weboldal-blokkoláshoz.
- Natív Android app valódi appblokkolással.
