// -----------------------------------------------------------------------------
// From the real FAA feeds to statuses: delays, programs, ground stops,
// closures (daily hours, exceptions for scheduled flights), causes, levels.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAirports } from '../src/airports.js';
import { reasonText, shortStatus, statusText } from '../src/devices.js';
import {
  arrivalDelay,
  causeOfCondition,
  causeOfReason,
  departureDelay,
  parseDuration,
  parseFeed,
  scheduledWindow,
} from '../src/status.js';
import { FEEDS, feed } from './helpers/world.js';

const read = (name, at = FEEDS[name].at) => ({ statuses: parseFeed(feed(name), at), at });

test('durations in words', () => {
  assert.equal(parseDuration('45 minutes'), 45);
  assert.equal(parseDuration('1 minute'), 1);
  assert.equal(parseDuration('1 hour'), 60);
  assert.equal(parseDuration('1 hour and 16 minutes'), 76);
  assert.equal(parseDuration('7 hours and 15 minutes'), 435);
  assert.equal(parseDuration('30'), 30);
  assert.equal(parseDuration(''), null);
  assert.equal(parseDuration(undefined), null);
});

test('causes: every condition and reason seen in the real feeds', () => {
  const conditions = {
    thunderstorms: 'thunderstorms',
    THUNDERSTORMS: 'thunderstorms',
    wind: 'wind',
    'low ceilings': 'low_ceilings',
    'snow or ice': 'snow_ice',
    'airport volume': 'volume',
    'airspace volume': 'volume',
    'runway construction': 'runway',
    'runway maintenance': 'runway',
    'equipment outage': 'equipment',
    'air show': 'air_show',
    security: 'security',
    other: 'other',
    '': 'other',
  };
  for (const [condition, cause] of Object.entries(conditions)) {
    assert.equal(causeOfCondition(condition), cause, condition);
  }
  const reasons = {
    'TM Initiatives:SWAP:WX': 'thunderstorms',
    'TM Initiatives:MIT:VOL': 'volume',
    'TM Initiatives:MIT:WX': 'weather',
    'TM Initiatives:STOP:WX': 'weather',
    'TM Initiatives:MINIT:STAFFING': 'staffing',
    'TM Initiatives:Metering:': 'other',
    'WX:Thunderstorms': 'thunderstorms',
    'WX:Wind': 'wind',
    'WX:Snow/Ice': 'snow_ice',
    'ZDV/WX:Wind': 'wind',
    'VOL:Compacted Demand': 'volume',
    'ZDC / VOL:Compacted Demand': 'volume',
    'STAFF:Staffing': 'staffing',
    'RWY:Construction': 'runway',
    'EQ:OCL: Equipment': 'equipment',
    'EQ:FAA': 'equipment',
    'VIPM:VIP Movement': 'vip',
    'OTHER:Air Show': 'air_show',
    'Something new': 'other',
  };
  for (const [reason, cause] of Object.entries(reasons)) {
    assert.equal(causeOfReason(reason), cause, reason);
  }
});

test('the July thunderstorms: ground stop, program and departure delays at EWR', () => {
  const { statuses, at } = read('storms');
  const ewr = statuses.get('EWR');
  assert.equal(ewr.level, 3);
  assert.equal(ewr.delayed, true);
  assert.equal(ewr.groundStop.end, '2026-07-09T21:45:00Z');
  assert.deepEqual(
    { average: ewr.groundDelay.average, maximum: ewr.groundDelay.maximum },
    { average: 110, maximum: 187 },
  );
  assert.deepEqual(ewr.departure, {
    average: 120,
    minimum: 121,
    maximum: 135,
    trend: 'increasing',
    cause: 'thunderstorms',
  });
  assert.equal(ewr.closure, null);
  assert.deepEqual(ewr.causes, ['thunderstorms']);
  // Paris time (the TZ of the tests): 21:45 UTC is 23:45.
  assert.equal(
    statusText(ewr, 'en', at),
    'Ground stop until 23:45 · Ground delay program, 110 min on average · Departures 121–135 min ↗',
  );
  assert.equal(shortStatus(ewr, 'fr', at), "Arrêt au sol jusqu'à 23:45");
  assert.deepEqual(departureDelay(ewr), { average: 120, maximum: 135 });
  // No arrival delay reported: the program's.
  assert.deepEqual(arrivalDelay(ewr), { average: 110, maximum: 187 });

  // Departure delays only: level 1; a program only: level 2.
  assert.equal(statuses.get('ATL').level, 1);
  assert.equal(statuses.get('BOS').level, 2);
  assert.equal(shortStatus(statuses.get('BOS'), 'en', at), 'Delay program, 42 min');
  assert.equal(statuses.get('PHX').departure.trend, 'decreasing');
  // LAX and SAN: only restrictions for general aviation (freeForm).
  assert.equal(statuses.get('LAX').level, 0);
  assert.equal(statusText(statuses.get('LAX'), 'fr', at), 'Trafic normal');
  assert.equal(reasonText(statuses.get('LAX'), 'de'), 'Keine Störung');
});

test('an arrival delay and a program: the larger counts as the arrival delay', () => {
  const { statuses, at } = read('arrivals');
  const ewr = statuses.get('EWR');
  assert.equal(ewr.level, 2);
  assert.deepEqual(
    { average: ewr.arrival.average, minimum: ewr.arrival.minimum, maximum: ewr.arrival.maximum },
    { average: 60, minimum: 61, maximum: 75 },
  );
  assert.equal(ewr.groundDelay.average, 80);
  assert.deepEqual(arrivalDelay(ewr), {
    average: 80,
    maximum: Math.max(75, ewr.groundDelay.maximum),
  });
  assert.match(statusText(ewr, 'es', at), /Llegadas 61–75 min ↗/);
  assert.equal(reasonText(ewr, 'en'), 'Wind, Other, Heavy traffic');
});

test('closures: in force, finished, not started, daily hours, scheduled flights', () => {
  // LGA closed for the night (04:02 to 10:00 UTC), read at 09:21 UTC.
  let { statuses, at } = read('quiet');
  const lga = statuses.get('LGA');
  assert.equal(lga.level, 3);
  assert.equal(lga.delayed, false);
  assert.equal(lga.closure.end, '2026-10-24T10:00:00Z');
  assert.equal(statusText(lga, 'fr', at), "Fermé jusqu'à 12:00");
  assert.equal(reasonText(lga, 'fr'), 'Fermeture (NOTAM)');
  // ALO: "CLSD EXC SKED ACFT", the airline flights still land.
  assert.equal(statuses.get('ALO').level, 0);
  // LGA at 10:00 UTC: reopened.
  ({ statuses } = read('quiet', Date.parse('2026-10-24T10:00:00Z')));
  assert.equal(statuses.get('LGA').closure, null);
  // At 03:00 UTC: not closed yet.
  ({ statuses } = read('quiet', Date.parse('2026-10-24T03:00:00Z')));
  assert.equal(statuses.get('LGA').closure, null);

  // PVD "DLY 0430-0945" from July 7 to August 15: open at 20:49 UTC...
  ({ statuses } = read('storms'));
  assert.equal(statuses.get('PVD').closure, null);
  // ...closed at 05:00 UTC, until 09:45 UTC of that day.
  ({ statuses } = read('storms', Date.parse('2026-07-10T05:00:00Z')));
  assert.equal(statuses.get('PVD').closure.end, '2026-07-10T09:45:00.000Z');

  // The winter storm: closures in force, de-icing ignored.
  ({ statuses } = read('winter'));
  assert.equal(statuses.get('LGA').level, 3);
  assert.equal(statuses.get('BOS').level, 0);
  assert.equal(statuses.get('DFW').groundDelay.cause, 'snow_ice');
});

test('daily windows: across midnight, days of the week', () => {
  const at = (iso) => Date.parse(iso);
  const night = 'AD AP CLSD DLY 2200-1000';
  assert.deepEqual(scheduledWindow(night, at('2026-10-24T09:21:00Z')), {
    end: at('2026-10-24T10:00:00Z'),
  });
  assert.deepEqual(scheduledWindow(night, at('2026-10-24T23:00:00Z')), {
    end: at('2026-10-25T10:00:00Z'),
  });
  assert.equal(scheduledWindow(night, at('2026-10-24T12:00:00Z')), null);
  // MRY "TUE-SAT 0701-1200": closed on Saturday 2 August 2025, open on Sunday.
  const week = 'AD AP CLSD EXC HEL TUE-SAT 0701-1200 2507290701-2508091200';
  assert.ok(scheduledWindow(week, at('2025-08-02T08:00:00Z')));
  assert.equal(scheduledWindow(week, at('2025-08-03T08:00:00Z')), null);
  // No hours: the whole period.
  assert.equal(scheduledWindow('AD AP CLSD 2601251907-2601260100', 0), undefined);
});

test('airports: by code, by ICAO code, by city, unknown codes', () => {
  assert.deepEqual(findAirports('jfk'), [{ code: 'JFK', name: 'New York JFK' }]);
  assert.deepEqual(findAirports(' KSFO '), [{ code: 'SFO', name: 'San Francisco' }]);
  assert.deepEqual(findAirports('san francisco'), [{ code: 'SFO', name: 'San Francisco' }]);
  assert.deepEqual(
    findAirports('Chicago').map((airport) => airport.code),
    ['GYY', 'MDW', 'ORD'],
  );
  // "ALO" is a code (Waterloo), not a piece of "Buffalo".
  assert.deepEqual(findAirports('ALO'), [{ code: 'ALO', name: '' }]);
  assert.deepEqual(findAirports('YUL'), [{ code: 'YUL', name: '' }]);
  assert.deepEqual(findAirports('Paris'), []);
  assert.deepEqual(findAirports('x'), []);
});
