// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake `fetch` answering like
// the FAA NAS Status feed from the real answers of test/fixtures/faa, a manual
// clock, a temporary /data, and the integration wired on top through
// registerHandlers. Nothing touches the network.
//
// The fixtures are real `api/airport-events` answers:
// - storms: 2026-07-09 20:49 UTC (Wayback Machine), thunderstorms in the
//   North-East: ground stops at EWR, JFK, LGA, PHL, DCA, BWI, IAD, delay
//   programs, departure delays;
// - arrivals: 2025-11-06 15:56 UTC (Wayback Machine), an arrival delay at
//   EWR, programs at SFO, DCA, LGA;
// - winter: 2026-01-25 19:50 UTC (Wayback Machine), a winter storm: dozens of
//   closures and de-icing;
// - quiet: 2026-10-24 09:21 UTC (read for this integration), a Saturday
//   morning: two closures (ALO, LGA) and restrictions for general aviation.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { API_URL } from '../../src/faa.js';
import { Store } from '../../src/store.js';

process.env.LOG_LEVEL ??= 'silent';
process.env.TZ = 'Europe/Paris';

export const fixtureJson = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/faa/${name}`, import.meta.url), 'utf8'));

export const FEEDS = {
  storms: { file: 'events-2026-07-09-storms.json', at: Date.parse('2026-07-09T20:49:44Z') },
  arrivals: { file: 'events-2025-11-06-arrivals.json', at: Date.parse('2025-11-06T15:56:15Z') },
  winter: { file: 'events-2026-01-25-winter.json', at: Date.parse('2026-01-25T19:50:18Z') },
  quiet: { file: 'events-2026-10-24-quiet.json', at: Date.parse('2026-10-24T09:21:55Z') },
};

/** A recorded feed (a fresh copy the test may change). */
export const feed = (name) => fixtureJson(FEEDS[name].file);

/**
 * A fake `fetch` answering like the FAA. `feed` holds what the next request
 * returns (change it to stage an event); `fail` makes every request fail with
 * an Error or an HTTP status. Every call is recorded in `calls`.
 */
export function createFetch(name = 'storms') {
  const network = { feed: feed(name), calls: [], fail: null };
  network.fetch = async (url, init) => {
    network.calls.push({ url, init });
    if (network.fail instanceof Error) {
      throw network.fail;
    }
    if (typeof network.fail === 'number') {
      return new Response('error', { status: network.fail });
    }
    if (url !== API_URL) {
      return new Response('not found', { status: 404 });
    }
    return new Response(JSON.stringify(network.feed), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return network;
}

/** A manual clock. */
export function createClock(start = FEEDS.storms.at) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {string} [options.feedName] the recorded feed served (and the clock start)
 * @param {object} [options.network] from createFetch
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {object} [options.saved] content of /data/airports.json before the start
 * @param {boolean} [options.connect]
 * @param {boolean} [options.timers]
 */
export async function createWorld({
  config = {},
  feedName = 'storms',
  network = createFetch(feedName),
  devices = [],
  saved,
  connect = true,
  timers = false,
  clock = createClock(FEEDS[feedName].at),
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-faa-')),
} = {}) {
  const gladys = createFakeGladys({ config, devices });
  const store = new Store(dataDir);
  if (saved) {
    await store.save(saved);
    await store.flush();
  }
  const app = registerHandlers(gladys, {
    store,
    fetch: network.fetch,
    timers,
    now: clock.now,
    dataDir,
  });
  const world = {
    gladys,
    fake: gladys.fake,
    app,
    service: app.service,
    network,
    clock,
    store,
    dataDir,
  };
  if (connect) {
    await gladys.connect();
    await app.ready;
  }
  return world;
}

/** Run a configuration action; resolves with its message (multi-language). */
export async function action(world, key, fields = {}) {
  const ack = await world.fake.action(key, fields);
  if (!ack.success) {
    throw new Error(`action ${key} failed: ${ack.error}`);
  }
  return ack.data.message;
}

/** The discovered device whose name contains `name`. */
export function discovered(world, name) {
  const device = world.fake.discoveredDevices.find((d) => d.name.includes(name));
  if (!device) {
    throw new Error(`no discovered device named ${name}`);
  }
  return device;
}

/** "Add to Gladys" on the discovered device named `name`; resolves with it. */
export async function create(world, name) {
  const device = discovered(world, name);
  await world.fake.deviceCreated(device);
  return device;
}

/** Follows the airports and creates their devices; resolves with them, by code. */
export async function follow(world, ...codes) {
  const devices = {};
  for (const code of codes) {
    await action(world, 'add_airport', { airport: code });
  }
  for (const code of codes) {
    devices[code] = await create(world, `FAA · ${code}`);
  }
  return devices;
}

/** The last state published on a feature of a device. */
export const lastState = (world, device, key) =>
  world.fake.lastState(`${device.external_id}:${key}`);

/** Captures the log lines of the integration at `level` and above. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
