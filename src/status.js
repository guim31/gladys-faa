// -----------------------------------------------------------------------------
// From one airport of the FAA feed to what Gladys shows: the four kinds of
// events (ground stop, ground delay program, departure and arrival delays,
// closure), their delays in minutes, their cause and a level of 0 to 3.
//
//   0  normal operations (the airport is not in the feed)
//   1  departure or arrival delays
//   2  ground delay program (flights held at their origin)
//   3  ground stop or closure (no traffic)
//
// What the FAA writes, seen on real answers (test/fixtures/faa):
// - ground stop and ground delay program: `impactingCondition` in plain words
//   ("thunderstorms", "low ceilings", "THUNDERSTORMS"), `endTime` (UTC), and for a
//   program `avgDelay` (a float) and `maxDelay` in minutes;
// - departure and arrival delays: `averageDelay` ("45", a string of minutes),
//   `arrivalDeparture.min`/`max` in words ("1 hour and 16 minutes"), `trend`,
//   and a coded `reason` ("TM Initiatives:SWAP:WX", "WX:Wind",
//   "ZDC / VOL:Compacted Demand", "EQ:OCL: Equipment");
// - closure: a NOTAM (`simpleText`) with `startTime`/`endTime`. A closure that
//   has not started yet is not a closure now. `freeForm` (restrictions for
//   general aviation, "AD AP CLSD TO TRANSIENT GA ACFT") is ignored.
// -----------------------------------------------------------------------------

export const MAX_LEVEL = 3;

// Causes Gladys names in four languages (src/messages.js CAUSES).
export const CAUSES = [
  'thunderstorms',
  'wind',
  'low_ceilings',
  'visibility',
  'snow_ice',
  'rain',
  'weather',
  'volume',
  'runway',
  'equipment',
  'staffing',
  'security',
  'vip',
  'air_show',
  'other',
];

/** "1 hour and 16 minutes" → 76, "45 minutes" → 45, "2 hours" → 120; null when unreadable. */
export function parseDuration(text) {
  const value = String(text ?? '').toLowerCase();
  const hours = value.match(/(\d+)\s*h(?:ou)?rs?/);
  const minutes = value.match(/(\d+)\s*min/);
  if (!hours && !minutes) {
    return /^\s*\d+\s*$/.test(value) ? Number(value) : null;
  }
  return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

const WEATHER_WORDS = [
  [/thunder|storm|swap|convect/, 'thunderstorms'],
  [/wind/, 'wind'],
  [/ceiling/, 'low_ceilings'],
  [/visib|fog/, 'visibility'],
  [/snow|\bic(?:e|ing)\b/, 'snow_ice'],
  [/\brain/, 'rain'],
];

/** The cause key of a condition or of a part of a reason, in plain words. */
function causeOfWords(text) {
  const value = String(text ?? '').toLowerCase();
  for (const [pattern, cause] of WEATHER_WORDS) {
    if (pattern.test(value)) {
      return cause;
    }
  }
  if (/volume|demand/.test(value)) {
    return 'volume';
  }
  if (/runway/.test(value)) {
    return 'runway';
  }
  if (/equipment|outage/.test(value)) {
    return 'equipment';
  }
  if (/staff/.test(value)) {
    return 'staffing';
  }
  if (/security/.test(value)) {
    return 'security';
  }
  if (/air ?show/.test(value)) {
    return 'air_show';
  }
  if (/vip/.test(value)) {
    return 'vip';
  }
  if (/weather/.test(value)) {
    return 'weather';
  }
  return null;
}

/** "thunderstorms", "low ceilings", "airport volume" → a cause key. */
export const causeOfCondition = (condition) => causeOfWords(condition) ?? 'other';

const REASON_CODES = {
  WX: 'weather',
  VOL: 'volume',
  RWY: 'runway',
  EQ: 'equipment',
  STAFF: 'staffing',
  STAFFING: 'staffing',
  VIPM: 'vip',
  SEC: 'security',
};

/**
 * "TM Initiatives:SWAP:WX" → thunderstorms, "WX:Wind" → wind,
 * "ZDC / VOL:Compacted Demand" → volume, "STAFF:Staffing" → staffing.
 */
export function causeOfReason(reason) {
  // A leading control centre ("ZDC / ", "ZDV/") says where, not why.
  const parts = String(reason ?? '')
    .replace(/^\s*Z[A-Z]{2}\s*\/\s*/, '')
    .split(':')
    .map((part) => part.trim())
    .filter(Boolean);
  if (/^TM Initiatives$/i.test(parts[0] ?? '')) {
    // Traffic management initiative: its type (SWAP is the severe weather
    // avoidance plan, i.e. storms), then its cause code.
    const [, type = '', code = ''] = parts;
    if (/^SWAP$/i.test(type)) {
      return 'thunderstorms';
    }
    return REASON_CODES[code.toUpperCase()] ?? causeOfWords(code) ?? 'other';
  }
  const [code = '', ...rest] = parts;
  const detail = causeOfWords(rest.join(' '));
  const coded = REASON_CODES[code.toUpperCase()];
  if (coded === 'weather') {
    return detail ?? 'weather';
  }
  return coded ?? detail ?? causeOfWords(code) ?? 'other';
}

const minutes = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
};

/** A departure or arrival delay: average, minimum, maximum (minutes), trend, cause. */
function parseFlowDelay(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const range = raw.arrivalDeparture ?? {};
  const minimum = parseDuration(range.min);
  const maximum = parseDuration(range.max);
  let average = minutes(raw.averageDelay);
  if (average === null && minimum !== null && maximum !== null) {
    average = Math.round((minimum + maximum) / 2);
  }
  const trend = String(raw.trend ?? range.trend ?? '').toLowerCase();
  return {
    average: average ?? maximum ?? minimum ?? 0,
    minimum: minimum ?? average ?? 0,
    maximum: maximum ?? average ?? minimum ?? 0,
    trend: ['increasing', 'decreasing'].includes(trend) ? trend : '',
    cause: causeOfReason(raw.reason),
  };
}

function parseGroundStop(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return {
    end: raw.endTime ?? raw.programExpirationTime ?? '',
    cause: causeOfCondition(raw.impactingCondition),
    probability: String(raw.probabilityOfExtension ?? '').toLowerCase(),
  };
}

function parseGroundDelay(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const average = minutes(raw.avgDelay) ?? 0;
  return {
    average,
    maximum: Math.max(minutes(raw.maxDelay) ?? 0, average),
    end: raw.endTime ?? '',
    cause: causeOfCondition(raw.impactingCondition),
  };
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY = DAYS.join('|');
// "DLY 0430-0945", "TUE-SAT 0701-1200", "DLY 2200-1000" (across midnight), UTC.
const SCHEDULE = new RegExp(
  `\\b(DLY|(${DAY})(?:-(${DAY}))?)\\s+(\\d{2})(\\d{2})-(\\d{2})(\\d{2})\\b`,
);
const DAY_MS = 24 * 3600 * 1000;

/**
 * The window of a recurring closure that contains `now`, or null when the
 * airport is open at this hour: { end } (ms). The FAA keeps such a NOTAM in
 * the feed for its whole period, day and night.
 */
export function scheduledWindow(text, now) {
  const match = SCHEDULE.exec(text);
  if (!match) {
    return undefined;
  }
  const [, , first, last, startH, startM, endH, endM] = match;
  const startMinutes = Number(startH) * 60 + Number(startM);
  const length = (Number(endH) * 60 + Number(endM) - startMinutes + 1440) % 1440 || 1440;
  const days = new Set();
  if (!first) {
    DAYS.forEach((_, index) => days.add(index));
  } else {
    const from = DAYS.indexOf(first);
    const to = last ? DAYS.indexOf(last) : from;
    for (let index = from; ; index = (index + 1) % 7) {
      days.add(index);
      if (index === to) {
        break;
      }
    }
  }
  // A window opened today, or yesterday and running past midnight.
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  for (const day of [today, today - DAY_MS]) {
    const opens = day + startMinutes * 60000;
    const closes = opens + length * 60000;
    if (days.has(new Date(day).getUTCDay()) && opens <= now && now < closes) {
      return { end: closes };
    }
  }
  return null;
}

/**
 * A closure in force at `now`: a NOTAM whose period contains now, and whose
 * daily hours too when it has some ("DLY 0430-0945"). A closure "EXC SKED
 * ACFT" lets the scheduled flights in: not a closure for a traveller.
 */
function parseClosure(raw, now) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const start = Date.parse(raw.startTime ?? '');
  const end = Date.parse(raw.endTime ?? '');
  if ((Number.isFinite(start) && start > now) || (Number.isFinite(end) && end <= now)) {
    return null;
  }
  const notam = String(raw.simpleText ?? raw.text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/\bEXC\b[^]*\bSKED\b/.test(notam)) {
    return null;
  }
  const window = scheduledWindow(notam, now);
  if (window === null) {
    return null;
  }
  return {
    end: window
      ? new Date(Math.min(window.end, Number.isFinite(end) ? end : Infinity)).toISOString()
      : (raw.endTime ?? ''),
    notam,
  };
}

/** The status of an airport the feed does not list. */
export function normalStatus(code) {
  return {
    code,
    longName: '',
    groundStop: null,
    groundDelay: null,
    departure: null,
    arrival: null,
    closure: null,
    level: 0,
    delayed: false,
    causes: [],
  };
}

/**
 * One airport of the feed.
 * @param {object} raw an element of api/airport-events
 * @param {number} now ms since the epoch
 */
export function parseAirport(raw, now) {
  const status = normalStatus(String(raw.airportId).toUpperCase());
  status.longName = String(raw.airportLongName ?? '').trim();
  status.groundStop = parseGroundStop(raw.groundStop);
  status.groundDelay = parseGroundDelay(raw.groundDelay);
  status.departure = parseFlowDelay(raw.departureDelay);
  status.arrival = parseFlowDelay(raw.arrivalDelay);
  status.closure = parseClosure(raw.airportClosure, now);
  status.delayed = Boolean(
    status.groundStop || status.groundDelay || status.departure || status.arrival,
  );
  if (status.groundStop || status.closure) {
    status.level = 3;
  } else if (status.groundDelay) {
    status.level = 2;
  } else if (status.departure || status.arrival) {
    status.level = 1;
  }
  // The causes, the most serious event first, without repeats.
  status.causes = [
    ...new Set(
      [status.groundStop, status.groundDelay, status.departure, status.arrival]
        .filter(Boolean)
        .map((event) => event.cause),
    ),
  ];
  return status;
}

/**
 * The statuses of the feed, by airport code.
 * @param {object[]} feed api/airport-events
 * @param {number} now
 * @returns {Map<string, object>}
 */
export function parseFeed(feed, now) {
  const statuses = new Map();
  for (const raw of feed) {
    const status = parseAirport(raw, now);
    statuses.set(status.code, status);
  }
  return statuses;
}

/** The departure delay of a status, in minutes: { average, maximum }. */
export function departureDelay(status) {
  return {
    average: status.departure?.average ?? 0,
    maximum: status.departure?.maximum ?? 0,
  };
}

/**
 * The arrival delay, in minutes: the larger of the reported arrival delay and
 * of the ground delay program (whose delays are assigned to the flights to
 * this airport, at their origin).
 */
export function arrivalDelay(status) {
  return {
    average: Math.max(status.arrival?.average ?? 0, status.groundDelay?.average ?? 0),
    maximum: Math.max(status.arrival?.maximum ?? 0, status.groundDelay?.maximum ?? 0),
  };
}
