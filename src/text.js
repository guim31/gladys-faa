// -----------------------------------------------------------------------------
// Small text helpers shared by the devices, the widget and the scenes.
// -----------------------------------------------------------------------------

/** Lower case, without accents nor extra spaces: for comparisons. */
export const fold = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Shortens a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/**
 * A time of the FAA (UTC) in the time zone of Gladys (TZ, set by the
 * supervisor): "21:45" within the next 20 hours, "1 Jan, 08:00" beyond.
 * Empty when the time is missing or unreadable.
 */
export function localTime(iso, language, now) {
  const time = Date.parse(iso ?? '');
  if (!Number.isFinite(time)) {
    return '';
  }
  const locale = LOCALES[language] ?? LOCALES.en;
  const options = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  if (Math.abs(time - now) > 20 * 3600 * 1000) {
    Object.assign(options, { day: 'numeric', month: 'short' });
  }
  return new Intl.DateTimeFormat(locale, options).format(time);
}
