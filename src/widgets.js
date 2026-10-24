// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - airports: every followed airport — a status row each ("JFK · New York
//   JFK" / "Ground stop until 22:45"), green when it runs normally, orange
//   with departure or arrival delays, red under a ground delay program, a
//   ground stop or a closure; the worst first. The caption gives the causes.
//
// Budget of the core: 8 components, 2 texts, a status of 10 rows at most.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { airportLabel } from './airports.js';
import { reasonText, shortStatus } from './devices.js';
import { TEXT, say } from './messages.js';
import { clip } from './text.js';

export const MAX_ROWS = 10;
const MAX_LABEL = 40;
// A caption longer than this is cut by the core.
const MAX_CAPTION = 80;

const t = (language, key, params) => say(TEXT, language, key, params);

export function levelColor(level) {
  if (level >= 2) {
    return WIDGET_COLORS.DANGER;
  }
  return level === 1 ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS;
}

const ttlOf = (service) => Math.max(60, Math.round(service.config.refreshSeconds / 2));

async function airportsContent(service, { language }) {
  const ttl = ttlOf(service);
  const airports = service.createdAirports();
  if (airports.length === 0) {
    return { ttl_seconds: ttl, components: [{ type: 'text', text: t(language, 'noAirports') }] };
  }
  await service.freshen(airports);
  const now = service.now();
  const known = airports
    .map((airport) => ({ airport, status: service.statuses.get(airport.code) }))
    .filter((entry) => entry.status)
    // The worst first, then by code.
    .sort(
      (a, b) => b.status.level - a.status.level || a.airport.code.localeCompare(b.airport.code),
    );
  const components = [{ type: 'text', variant: 'heading', text: t(language, 'heading') }];
  if (known.length === 0) {
    components.push({ type: 'text', variant: 'body', text: t(language, 'loading') });
    return { ttl_seconds: ttl, components };
  }
  const disrupted = known.filter((entry) => entry.status.level > 0);
  components.push({
    type: 'text',
    variant: 'caption',
    text:
      disrupted.length > 0
        ? clip(
            `⚠ ${disrupted
              .map(({ airport, status }) => `${airport.code}: ${reasonText(status, language)}`)
              .join(' · ')}`,
            MAX_CAPTION,
          )
        : t(language, 'allGood'),
  });
  components.push({
    type: 'status',
    items: known.slice(0, MAX_ROWS).map(({ airport, status }) => ({
      label: clip(airportLabel(airport), MAX_LABEL),
      value: shortStatus(status, language, now),
      color: levelColor(status.level),
    })),
  });
  return { ttl_seconds: ttl, components };
}

export const WIDGETS = {
  airports: { get: airportsContent },
};
