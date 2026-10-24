// -----------------------------------------------------------------------------
// The integration end to end, against the SDK's fake Gladys and the real FAA
// answers: configuration actions, discovered devices, states, the scene
// trigger, the widget, the scene action, persistence, failures, logs.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { MAX_AIRPORTS, TRIGGERS } from '../src/service.js';
import {
  FEEDS,
  action,
  captureLogs,
  createFetch,
  createWorld,
  discovered,
  feed,
  follow,
  lastState,
} from './helpers/world.js';
import { stageEverything } from './helpers/scenario.js';

const fr = (message) => message.fr;

test('nothing followed: no request at all, the status says so', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await world.service.refresh();
  assert.equal(world.network.calls.length, 0);
  assert.deepEqual(world.fake.discoveredDevices, []);
  assert.match(fr(await action(world, 'status')), /Aucun aéroport suivi/);
});

test('follow an airport: code, ICAO, city, ambiguous, unknown, duplicate, minor', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.match(
    fr(await action(world, 'add_airport', { airport: 'jfk' })),
    /JFK · New York JFK suivi/,
  );
  assert.match(fr(await action(world, 'add_airport', { airport: 'KSFO' })), /SFO · San Francisco/);
  assert.match(fr(await action(world, 'add_airport', { airport: 'atlanta' })), /ATL · Atlanta/);
  const ambiguous = await action(world, 'add_airport', { airport: 'Washington' });
  assert.match(fr(ambiguous), /Plusieurs aéroports/);
  assert.match(fr(ambiguous), /• DCA · Washington Reagan\n• IAD · Washington Dulles/);
  const unknown = await world.fake.action('add_airport', { airport: 'Paris' });
  assert.equal(unknown.success, true);
  assert.match(unknown.data.message.en, /No airport matches “Paris”/);
  assert.match(fr(await action(world, 'add_airport', { airport: 'JFK' })), /déjà suivi/);
  assert.match(fr(await action(world, 'add_airport', { airport: '' })), /Tapez un code/);
  // A code outside the list: followed, with a word of warning.
  const minor = await action(world, 'add_airport', { airport: 'ALO' });
  assert.match(minor.en, /ALO followed/);
  assert.match(minor.en, /Not one of the 77 major airports/);
  assert.deepEqual(
    world.fake.discoveredDevices.map((device) => device.name),
    ['FAA · JFK · New York JFK', 'FAA · SFO · San Francisco', 'FAA · ATL · Atlanta', 'FAA · ALO'],
  );
  const saved = JSON.parse(await readFile(join(world.dataDir, 'airports.json'), 'utf8'));
  assert.deepEqual(
    saved.airports.map((airport) => airport.code),
    ['JFK', 'SFO', 'ATL', 'ALO'],
  );
});

test('at most MAX_AIRPORTS airports', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const codes = ['ATL', 'BOS', 'BWI', 'CLT', 'DCA', 'DEN', 'DFW', 'DTW', 'EWR', 'FLL'];
  for (const code of [
    ...codes,
    'IAD',
    'IAH',
    'JFK',
    'LAS',
    'LAX',
    'LGA',
    'MCO',
    'MIA',
    'MSP',
    'ORD',
  ]) {
    await action(world, 'add_airport', { airport: code });
  }
  assert.equal(world.service.airports.length, MAX_AIRPORTS);
  const refused = await world.fake.action('add_airport', { airport: 'SEA' });
  assert.match(refused.data.message.fr, /Vous suivez déjà 20 aéroports/);
});

test('states on the July thunderstorms: EWR ground stop, ATL delays, LAX normal', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const { EWR, ATL, LAX } = await follow(world, 'EWR', 'ATL', 'LAX');
  // One request for every airport.
  assert.ok(world.network.calls.length >= 1);
  const calls = world.network.calls.length;
  await world.service.refresh();
  assert.equal(world.network.calls.length, calls + 1);

  assert.equal(
    lastState(world, EWR, 'status'),
    "Arrêt au sol jusqu'à 23:45 · Programme de retards au sol, 110 min en moyenne · Départs 121–135 min ↗",
  );
  assert.equal(lastState(world, EWR, 'level'), 3);
  assert.equal(lastState(world, EWR, 'delayed'), 1);
  assert.equal(lastState(world, EWR, 'ground_stop'), 1);
  assert.equal(lastState(world, EWR, 'ground_delay'), 1);
  assert.equal(lastState(world, EWR, 'closed'), 0);
  assert.equal(lastState(world, EWR, 'departure_delay'), 120);
  assert.equal(lastState(world, EWR, 'departure_delay_max'), 135);
  assert.equal(lastState(world, EWR, 'arrival_delay'), 110);
  assert.equal(lastState(world, EWR, 'arrival_delay_max'), 187);
  assert.equal(lastState(world, EWR, 'reason'), 'Orages');

  assert.equal(lastState(world, ATL, 'level'), 1);
  assert.equal(lastState(world, ATL, 'ground_stop'), 0);
  assert.equal(lastState(world, ATL, 'departure_delay_max'), 105);

  assert.equal(lastState(world, LAX, 'status'), 'Trafic normal');
  assert.equal(lastState(world, LAX, 'level'), 0);
  assert.equal(lastState(world, LAX, 'delayed'), 0);
  assert.equal(lastState(world, LAX, 'reason'), 'Aucune perturbation');
});

test('only the changes are published, everything again on a created device', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const { EWR } = await follow(world, 'EWR');
  const published = () => world.fake.states.length;
  const before = published();
  await world.service.refresh();
  assert.equal(published(), before, 'nothing changed: nothing published');
  await world.fake.deviceCreated(EWR);
  assert.equal(published(), before + 11, 'the 11 features again');
});

test('trigger: silent first read, then closed, reopened, declared and lifted', async (t) => {
  const world = await createWorld({ feedName: 'quiet' });
  t.after(() => world.app.stop());
  const { devices, events } = await stageEverything(world);
  const summary = events.map((event) => `${event.data.airport_code} ${event.data.event}`);
  assert.deepEqual(summary, [
    // The thunderstorms arrive: LGA reopens, ground stops and programs.
    'JFK ground_stop_declared',
    'JFK delay_declared',
    'EWR ground_stop_declared',
    'EWR delay_declared',
    'LGA reopened',
    'LGA ground_stop_declared',
    'LGA delay_declared',
    // Ground stops lifted; delays not yet (one read without them).
    'JFK ground_stop_lifted',
    'EWR ground_stop_lifted',
    'LGA ground_stop_lifted',
    // Second read without delays: over. LGA closes for the night again.
    'JFK delay_lifted',
    'EWR delay_lifted',
    'LGA closed',
    'LGA delay_lifted',
  ]);
  assert.ok(events.every((event) => event.key === TRIGGERS.CHANGED));
  const declared = events[0].data;
  assert.equal(declared.airport, devices.JFK.external_id);
  assert.equal(declared.airport_name, 'JFK · New York JFK');
  assert.equal(declared.level, 3);
  assert.equal(declared.previous_level, 0);
  assert.equal(declared.reason, 'Orages');
  assert.equal(declared.departure_delay, 30);
  assert.equal(declared.arrival_delay, 117);
  assert.equal(declared.until, '23:45');
  assert.match(declared.status, /^Arrêt au sol jusqu'à 23:45/);
  const lifted = events.find((event) => event.data.event === 'ground_stop_lifted').data;
  assert.equal(lifted.level, 0);
  assert.equal(lifted.previous_level, 3);
  assert.equal(lifted.until, '');
  const closed = events.find((event) => event.data.event === 'closed').data;
  assert.equal(closed.until, '12:00');
  assert.equal(closed.reason, 'Fermeture (NOTAM)');
});

test('the container reads the FAA on its own timer, without onPoll', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const world = await createWorld({ timers: true, config: { refresh_interval: '600' } });
  t.after(() => world.app.stop());
  const { JFK } = await follow(world, 'JFK');
  const calls = world.network.calls.length;
  world.network.feed = [];
  t.mock.timers.tick(600000);
  await new Promise((resolve) => setImmediate(resolve));
  await world.service.inflight;
  assert.equal(world.network.calls.length, calls + 1);
  assert.equal(lastState(world, JFK, 'level'), 0);
  t.mock.timers.tick(600000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(world.network.calls.length, calls + 2);
});

test('the polling fallback reads at most once per half interval', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await follow(world, 'JFK');
  const calls = world.network.calls.length;
  await world.fake.poll();
  assert.equal(world.network.calls.length, calls);
  world.clock.advance(150000);
  await world.fake.poll();
  assert.equal(world.network.calls.length, calls + 1);
});

test('the FAA down: one warning and the connection status, then back', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const { EWR } = await follow(world, 'EWR');
  const logs = captureLogs(t, 'info');
  world.network.fail = 503;
  await world.service.refresh();
  await world.service.refresh();
  world.network.fail = new TypeError('fetch failed');
  await world.service.refresh();
  const warnings = logs.filter((line) => line.level === 'warn');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].text, /Cannot read the FAA: nasstatus\.faa\.gov: HTTP 503/);
  const down = world.fake.connectionStatuses.at(-1);
  assert.equal(down.connected, false);
  assert.match(down.message.fr, /La FAA ne répond pas/);
  assert.match(
    fr(await action(world, 'status')),
    /Dernière erreur : nasstatus\.faa\.gov: unreachable/,
  );
  // The last states stay.
  assert.equal(lastState(world, EWR, 'ground_stop'), 1);
  world.network.fail = null;
  await world.service.refresh();
  assert.equal(world.fake.connectionStatuses.at(-1).connected, true);
  assert.ok(logs.some((line) => line.level === 'info' && /FAA reachable again/.test(line.text)));
});

test('an answer that is not a list is an error, not "all normal"', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const { EWR } = await follow(world, 'EWR');
  world.network.feed = { message: 'maintenance' };
  await world.service.refresh();
  assert.equal(world.service.lastError, 'nasstatus.faa.gov: unexpected answer');
  assert.equal(lastState(world, EWR, 'level'), 3);
});

test('the request names the integration and asks for JSON', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await follow(world, 'EWR');
  const { url, init } = world.network.calls[0];
  assert.equal(url, 'https://nasstatus.faa.gov/api/airport-events');
  assert.equal(init.headers.Accept, 'application/json');
  assert.match(init.headers['User-Agent'], /^gladys-faa /);
});

test('a normal read writes nothing at info level', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await follow(world, 'EWR', 'ATL');
  const logs = captureLogs(t, 'info');
  world.clock.advance(300000);
  await world.service.refresh();
  world.network.feed = [];
  world.clock.advance(300000);
  await world.service.refresh();
  assert.deepEqual(logs, []);
});

test('/data lost: the airports come back from the Gladys devices', async (t) => {
  const first = await createWorld();
  const { JFK } = await follow(first, 'JFK');
  await first.app.stop();
  const world = await createWorld({ devices: [JFK] });
  t.after(() => world.app.stop());
  assert.deepEqual(world.service.airports, [{ code: 'JFK', name: 'New York JFK' }]);
  assert.equal(lastState(world, JFK, 'ground_stop'), 1);
});

test('remove an airport; it does not come back at the restart, even with its device', async (t) => {
  const first = await createWorld();
  const { JFK } = await follow(first, 'JFK', 'EWR');
  assert.match(
    fr(await action(first, 'remove_airport', { airport: 'kjfk' })),
    /JFK · New York JFK n'est plus suivi/,
  );
  const missing = await first.fake.action('remove_airport', { airport: 'BOS' });
  assert.match(missing.data.message.fr, /Aucun aéroport suivi ne correspond à « BOS »/);
  assert.match(fr(await action(first, 'remove_airport', { airport: 'Newark' })), /EWR · Newark/);
  await first.app.stop();
  const world = await createWorld({ devices: [JFK], dataDir: first.dataDir });
  t.after(() => world.app.stop());
  assert.deepEqual(world.service.airports, []);
  // Followed again: back.
  await action(world, 'add_airport', { airport: 'JFK' });
  assert.equal(discovered(world, 'JFK').external_id, JFK.external_id);
});

test('the status lists the airports, their state and their devices', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await follow(world, 'EWR');
  await action(world, 'add_airport', { airport: 'LAX' });
  world.clock.advance(42000);
  const message = await action(world, 'status');
  assert.equal(
    message.en,
    [
      '2 airport(s) followed:',
      '• EWR · Newark · Ground stop until 23:45 · Ground delay program, 110 min on average · Departures 121–135 min ↗ — device created',
      '• LAX · Los Angeles — device not created yet (Discover tab)',
      'Last read 42 s ago: the FAA reports events at 19 airport(s) in the United States.',
    ].join('\n'),
  );
});

test('the widget: worst first, coloured, causes in the caption', async (t) => {
  const world = await createWorld({ config: { language: 'en' } });
  t.after(() => world.app.stop());
  const empty = await world.fake.widgetGet('airports', { language: 'en' });
  assert.match(empty.data.content.components[0].text, /Follow an airport/);
  await follow(world, 'LAX', 'ATL', 'JFK', 'BOS');
  const result = await world.fake.widgetGet('airports', { language: 'fr' });
  assert.equal(result.success, true);
  const content = result.data.content;
  assert.deepEqual(validateWidgetContent(content).errors ?? [], []);
  assert.equal(content.components[0].text, 'État des aéroports (FAA)');
  assert.equal(content.components[1].text, '⚠ JFK: Orages · BOS: Orages · ATL: Orages');
  assert.deepEqual(
    content.components[2].items.map((item) => [item.label, item.value, item.color]),
    [
      ['JFK · New York JFK', "Arrêt au sol jusqu'à 23:45", 'danger'],
      ['BOS · Boston Logan', 'Régulation, 42 min', 'danger'],
      ['ATL · Atlanta', 'Départs 91–105 min ↗', 'warning'],
      ['LAX · Los Angeles', 'Trafic normal', 'success'],
    ],
  );
  world.network.feed = [];
  world.clock.advance(300000);
  await world.service.refresh();
  const calm = await world.fake.widgetGet('airports', { language: 'de' });
  assert.equal(
    calm.data.content.components[1].text,
    'Normaler Betrieb an allen verfolgten Flughäfen.',
  );
});

test('a created device asks the widget to refresh', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await follow(world, 'JFK');
  assert.ok(world.fake.widgetRefreshes.includes('airports'));
});

test('the scene action: numbers and a sentence; unknown device', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const { EWR, LAX } = await follow(world, 'EWR', 'LAX');
  const result = await world.fake.sceneAction('get_airport_status', { airport: EWR.external_id });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.outputs, {
    sentence:
      "EWR · Newark : Arrêt au sol jusqu'à 23:45 · Programme de retards au sol, 110 min en moyenne · Départs 121–135 min ↗. Motif : Orages.",
    airport_code: 'EWR',
    airport_name: 'EWR · Newark',
    status:
      "Arrêt au sol jusqu'à 23:45 · Programme de retards au sol, 110 min en moyenne · Départs 121–135 min ↗",
    level: 3,
    level_name: 'Arrêt au sol ou fermeture',
    delayed: 1,
    ground_stop: 1,
    ground_delay: 1,
    closed: 0,
    departure_delay: 120,
    departure_delay_max: 135,
    arrival_delay: 110,
    arrival_delay_max: 187,
    reason: 'Orages',
  });
  const calm = await world.fake.sceneAction('get_airport_status', { airport: LAX.external_id });
  assert.equal(calm.data.outputs.sentence, 'LAX · Los Angeles : Trafic normal.');
  assert.equal(calm.data.outputs.reason, '');
  const gone = await world.fake.sceneAction('get_airport_status', { airport: 'faa:airport:XXX' });
  assert.equal(gone.success, false);
  assert.match(gone.error, /Cet aéroport n'est plus suivi/);
});

test('a language change renames the texts, not the features', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const { EWR } = await follow(world, 'EWR');
  await world.fake.configUpdated({ language: 'es' });
  assert.equal(lastState(world, EWR, 'reason'), 'Tormentas');
  assert.equal(discovered(world, 'EWR').features[0].name, 'Estado');
  assert.equal(EWR.features[0].name, 'État');
});

test('refreshes asked during a read share a single follow-up read', async (t) => {
  const world = await createWorld({ network: createFetch('storms') });
  t.after(() => world.app.stop());
  await follow(world, 'JFK');
  const calls = world.network.calls.length;
  await Promise.all([1, 2, 3, 4].map(() => world.service.refresh()));
  assert.equal(world.network.calls.length, calls + 2);
});

test('the winter storm: a closed airport and a program for snow', async (t) => {
  const world = await createWorld({ feedName: 'winter' });
  t.after(() => world.app.stop());
  world.network.feed = feed('winter');
  world.clock.time = FEEDS.winter.at;
  const { LGA, DFW } = await follow(world, 'LGA', 'DFW');
  assert.equal(lastState(world, LGA, 'closed'), 1);
  assert.equal(lastState(world, LGA, 'delayed'), 0);
  assert.equal(lastState(world, LGA, 'status'), "Fermé jusqu'à 02:00");
  assert.equal(lastState(world, DFW, 'reason'), 'Neige ou glace');
});
