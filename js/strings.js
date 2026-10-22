// All user-facing text (Hungarian). Keep every UI string here so the app can
// be translated later. Placeholders use {name} syntax – see format().

export const strings = {
  appName: 'Detox',
  skipLink: 'Ugrás a tartalomra',

  nav: {
    label: 'Fő navigáció',
    today: 'Ma',
    history: 'Napló',
    settings: 'Beállítások',
  },

  titles: {
    start: 'Új vállalás',
    today: 'Ma',
    checkin: 'Esti check-in',
    history: 'Napló',
    summary: 'Összegzés',
    settings: 'Beállítások',
  },

  common: {
    back: 'Vissza',
    close: 'Bezárás',
    comingSoon: 'Ez a képernyő a következő fejlesztési lépésben készül el.',
  },

  notices: {
    corrupt:
      'A korábban mentett adatokat nem sikerült beolvasni, ezért az app üres állapotból indult. A régi adatokról másolat maradt ezen az eszközön.',
    unavailable:
      'Ez a böngésző most nem engedi az adatok mentését (például privát módban). Az app működik, de amit beírsz, bezáráskor elveszhet.',
  },

  pageTitle: '{title} · Detox',
};

/** Fills {placeholders} in a string: format('Nap {n}', { n: 3 }) → 'Nap 3'. */
export function format(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}
