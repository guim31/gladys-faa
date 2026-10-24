// -----------------------------------------------------------------------------
// The Gladys device of a followed airport: its status in words, a level of 0
// to 3, four yes/no (delays, ground stop, ground delay program, closure), the
// average and maximum delays of departures and arrivals in minutes, and the
// cause.
//
// Read-only, no polling: the service reads the FAA on its own timer
// (src/service.js), Gladys never polls (`should_poll: false`). Texts keep no
// history; the level, the yes/no and the delays do (they change a few times a
// day at most).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { airportLabel } from './airports.js';
import { NAMES, TEXT, causeName, say } from './messages.js';
import { MAX_LEVEL, arrivalDelay, departureDelay } from './status.js';
import { clip, localTime } from './text.js';

export const AIRPORT_TYPE = 'airport';
export const MAX_TEXT_STATE = 200;
// The longest delay the features show: 12 hours (the FAA has announced 7).
export const MAX_DELAY_MINUTES = 720;
export const FEATURES = [
  'status',
  'level',
  'delayed',
  'ground_stop',
  'ground_delay',
  'closed',
  'departure_delay',
  'departure_delay_max',
  'arrival_delay',
  'arrival_delay_max',
  'reason',
];

const readOnly = { read_only: true, has_feedback: false };

const text = (name, externalId) => ({
  name,
  external_id: externalId,
  category: DEVICE_FEATURE_CATEGORIES.TEXT,
  type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
  // NOT NULL in the core, even for a text (422 on "Add to Gladys" without).
  min: 0,
  max: 0,
  ...readOnly,
  keep_history: false,
});

// input/binary: a yes/no the dashboard labels (light-sensor/binary has none).
const flag = (name, externalId) => ({
  name,
  external_id: externalId,
  category: DEVICE_FEATURE_CATEGORIES.INPUT,
  type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
  min: 0,
  max: 1,
  ...readOnly,
  keep_history: true,
});

const delay = (name, externalId) => ({
  name,
  external_id: externalId,
  category: DEVICE_FEATURE_CATEGORIES.DURATION,
  type: DEVICE_FEATURE_TYPES.DURATION.INTEGER,
  unit: DEVICE_FEATURE_UNITS.MINUTES,
  min: 0,
  max: MAX_DELAY_MINUTES,
  ...readOnly,
  keep_history: true,
});

/**
 * The device of a followed airport.
 * @param {object} gladys
 * @param {{ code: string, name: string }} airport
 * @param {string} language
 */
export function buildAirportDevice(gladys, airport, language) {
  const ids = gladys.externalIds(AIRPORT_TYPE, airport.code);
  const names = NAMES[language] ?? NAMES.en;
  return {
    name: clip(`FAA · ${airportLabel(airport)}`, 80),
    external_id: ids.device,
    should_poll: false,
    // What is needed to follow the airport again when /data is lost.
    params: [
      { name: 'airport_code', value: airport.code },
      { name: 'airport_name', value: airport.name ?? '' },
    ],
    features: [
      text(names.status, ids.feature('status')),
      {
        name: names.level,
        external_id: ids.feature('level'),
        category: DEVICE_FEATURE_CATEGORIES.RISK,
        type: DEVICE_FEATURE_TYPES.RISK.INTEGER,
        min: 0,
        max: MAX_LEVEL,
        ...readOnly,
        keep_history: true,
      },
      flag(names.delayed, ids.feature('delayed')),
      flag(names.ground_stop, ids.feature('ground_stop')),
      flag(names.ground_delay, ids.feature('ground_delay')),
      flag(names.closed, ids.feature('closed')),
      delay(names.departure_delay, ids.feature('departure_delay')),
      delay(names.departure_delay_max, ids.feature('departure_delay_max')),
      delay(names.arrival_delay, ids.feature('arrival_delay')),
      delay(names.arrival_delay_max, ids.feature('arrival_delay_max')),
      text(names.reason, ids.feature('reason')),
    ],
  };
}

const TREND = { increasing: ' ↗', decreasing: ' ↘' };

/** "16–30 min ↗", "45 min". */
export function rangeText(flow) {
  const range =
    flow.minimum < flow.maximum ? `${flow.minimum}–${flow.maximum} min` : `${flow.maximum} min`;
  return `${range}${TREND[flow.trend] ?? ''}`;
}

const t = (language, key, params) => say(TEXT, language, key, params);

const untilText = (language, now, end, withTime, without) => {
  const time = localTime(end, language, now);
  return time ? t(language, withTime, { time }) : t(language, without);
};

/**
 * Every event of an airport, the most serious first:
 * "Ground stop until 22:45 · Ground delay program, 110 min on average · Departures 121–135 min ↗".
 */
export function statusParts(status, language, now) {
  const parts = [];
  if (status.closure) {
    parts.push(untilText(language, now, status.closure.end, 'closedUntil', 'closed'));
  }
  if (status.groundStop) {
    parts.push(untilText(language, now, status.groundStop.end, 'groundStopUntil', 'groundStop'));
  }
  if (status.groundDelay) {
    parts.push(t(language, 'program', { average: status.groundDelay.average }));
  }
  if (status.departure) {
    parts.push(t(language, 'departures', { range: rangeText(status.departure) }));
  }
  if (status.arrival) {
    parts.push(t(language, 'arrivals', { range: rangeText(status.arrival) }));
  }
  return parts;
}

/** The status in words, 200 characters at most. */
export function statusText(status, language, now) {
  const parts = statusParts(status, language, now);
  return clip(parts.length > 0 ? parts.join(' · ') : t(language, 'normal'), MAX_TEXT_STATE);
}

/** The most serious event only, 40 characters at most (a widget row). */
export function shortStatus(status, language, now) {
  let text;
  if (status.closure) {
    text = untilText(language, now, status.closure.end, 'closedUntil', 'closed');
  } else if (status.groundStop) {
    text = untilText(language, now, status.groundStop.end, 'groundStopUntil', 'groundStop');
  } else if (status.groundDelay) {
    text = t(language, 'shortProgram', { average: status.groundDelay.average });
  } else if (status.departure) {
    text = t(language, 'departures', { range: rangeText(status.departure) });
  } else if (status.arrival) {
    text = t(language, 'arrivals', { range: rangeText(status.arrival) });
  } else {
    text = t(language, 'normal');
  }
  return clip(text, 40);
}

/** "Thunderstorms, Heavy traffic", "Closure (NOTAM)", or "No disruption". */
export function reasonText(status, language) {
  const causes = status.causes.map((cause) => causeName(cause, language));
  if (status.closure) {
    causes.unshift(t(language, 'closureReason'));
  }
  return clip(causes.length > 0 ? causes.join(', ') : t(language, 'noDisruption'), MAX_TEXT_STATE);
}

const capped = (minutes) => Math.min(minutes, MAX_DELAY_MINUTES);

/**
 * The states of a followed airport.
 * @param {object} gladys
 * @param {string} code
 * @param {object} status from src/status.js
 * @param {string} language
 * @param {number} now
 */
export function airportStates(gladys, code, status, language, now) {
  const ids = gladys.externalIds(AIRPORT_TYPE, code);
  const departure = departureDelay(status);
  const arrival = arrivalDelay(status);
  const state = (key, value) => ({ device_feature_external_id: ids.feature(key), state: value });
  return [
    { device_feature_external_id: ids.feature('status'), text: statusText(status, language, now) },
    state('level', status.level),
    state('delayed', status.delayed ? 1 : 0),
    state('ground_stop', status.groundStop ? 1 : 0),
    state('ground_delay', status.groundDelay ? 1 : 0),
    state('closed', status.closure ? 1 : 0),
    state('departure_delay', capped(departure.average)),
    state('departure_delay_max', capped(departure.maximum)),
    state('arrival_delay', capped(arrival.average)),
    state('arrival_delay_max', capped(arrival.maximum)),
    { device_feature_external_id: ids.feature('reason'), text: reasonText(status, language) },
  ];
}
