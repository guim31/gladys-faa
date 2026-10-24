// -----------------------------------------------------------------------------
// The FAA service: the followed airports (configuration actions, /data), their
// devices, the refresh timer (one request for every airport), the states and
// the scene trigger.
//
// The trigger never fires at the first read after a start: what was already
// there when the integration started is not news. Its memory lives in RAM only
// (a delay lives minutes to hours, and /data is often an SD card).
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { MAJOR_AIRPORTS, airportLabel, findAirports } from './airports.js';
import {
  AIRPORT_TYPE,
  airportStates,
  buildAirportDevice,
  reasonText,
  statusText,
} from './devices.js';
import { Faa } from './faa.js';
import { TEXT, say, sayAll } from './messages.js';
import { arrivalDelay, departureDelay, normalStatus, parseFeed } from './status.js';
import { fold, localTime } from './text.js';

const logger = createLogger({ name: 'faa' });

export const TRIGGERS = {
  CHANGED: 'airport_status_changed',
};
// Events of the trigger (its `event` filter), in the order they fire.
export const EVENTS = [
  'closed',
  'reopened',
  'ground_stop_declared',
  'ground_stop_lifted',
  'delay_declared',
  'delay_lifted',
];

export const MAX_AIRPORTS = 20;
const LANGS = ['en', 'fr', 'de', 'es'];
// A value that does not change is published again this often, so that Gladys
// does not show it as stale ("no recent value" after 48 h).
const HEARTBEAT_MS = 6 * 3600 * 1000;

export class SceneError extends Error {}

const each = (fn) => Object.fromEntries(LANGS.map((lang) => [lang, fn(lang)]));

/** What the trigger compares from one read to the next. */
const flagsOf = (status) => ({
  closed: Boolean(status.closure),
  groundStop: Boolean(status.groundStop),
  // Delays proper: a ground stop is its own event.
  delay: Boolean(status.groundDelay || status.departure || status.arrival),
});

export class FaaService {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the fake one)
   * @param {object} options.store Store (src/store.js)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: refresh by hand
   */
  constructor({ gladys, store, fetch, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.store = store;
    this.config = { language: 'fr', refreshSeconds: 300 };
    this.faa = new Faa({ fetch });
    this.now = now;
    this.timers = timers;
    this.airports = [];
    this.removed = [];
    // code → parsed status of the last read (src/status.js), with `at`.
    this.statuses = new Map();
    // code → flags of the previous read (RAM): the trigger compares.
    this.flags = new Map();
    this.feedCount = 0;
    this.refreshedAt = 0;
    this.lastError = null;
    this.inflight = null;
    this.timer = null;
  }

  // --- Lifecycle ---------------------------------------------------------------

  async start(config) {
    this.config = config;
    const saved = await this.store.load();
    this.airports = Array.isArray(saved.airports)
      ? saved.airports.filter((airport) => typeof airport?.code === 'string')
      : [];
    this.removed = Array.isArray(saved.removed) ? saved.removed : [];
    await this.restoreFromDevices();
    await this.publishDiscovered();
    await this.gladys.setConnectionStatus(true).catch(() => {});
    this.startTimer();
    await this.refresh();
  }

  async resync(config) {
    await this.reconfigure(config, { force: true });
  }

  async reconfigure(config, { force = false } = {}) {
    const previous = this.config;
    this.config = config;
    if (previous.refreshSeconds !== config.refreshSeconds) {
      this.startTimer();
    }
    if (force || previous.language !== config.language) {
      // The feature names stay as they were created (frozen by the core); the
      // texts of the states follow the language.
      await this.publishDiscovered();
      await this.refresh({ republish: true });
    }
  }

  startTimer() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.timers) {
      this.timer = setInterval(() => {
        this.refresh().catch((err) => logger.error('Refresh failed', err));
      }, this.config.refreshSeconds * 1000);
      this.timer.unref?.();
    }
  }

  async stop() {
    clearInterval(this.timer);
    this.timer = null;
    await this.inflight?.catch(() => {});
    await this.store.flush();
  }

  save() {
    return this.store.save({ airports: this.airports, removed: this.removed });
  }

  // --- Devices ----------------------------------------------------------------

  deviceId(airport) {
    return this.gladys.externalIds(AIRPORT_TYPE, airport.code).device;
  }

  isCreated(externalId) {
    return (this.gladys.devices ?? []).some((device) => device.external_id === externalId);
  }

  airportOfDevice(externalId) {
    return this.airports.find((airport) => this.deviceId(airport) === externalId) ?? null;
  }

  createdAirports() {
    return this.airports.filter((airport) => this.isCreated(this.deviceId(airport)));
  }

  /** The airports of the devices created in Gladys but missing from /data. */
  async restoreFromDevices() {
    let devices;
    try {
      devices = await this.gladys.getDevices();
    } catch (err) {
      logger.warn(`Cannot read the devices of the integration: ${err.message}`);
      return;
    }
    const param = (device, name) => device.params?.find((p) => p.name === name)?.value ?? '';
    let changed = false;
    for (const device of devices ?? []) {
      const code = String(param(device, 'airport_code')).toUpperCase();
      if (
        !code ||
        this.removed.includes(code) ||
        this.airports.some((airport) => airport.code === code)
      ) {
        continue;
      }
      this.airports.push({ code, name: param(device, 'airport_name') });
      changed = true;
    }
    if (changed) {
      logger.info(`${this.airports.length} airport(s) restored from the Gladys devices`);
      await this.save();
    }
  }

  async publishDiscovered() {
    const language = this.config.language;
    try {
      await this.gladys.publishDiscoveredDevices(
        this.airports.map((airport) => buildAirportDevice(this.gladys, airport, language)),
      );
    } catch (err) {
      logger.warn(`Cannot publish the discovered devices: ${err.message}`);
    }
  }

  async onDeviceCreated(device) {
    if (!this.airportOfDevice(device?.external_id)) {
      return;
    }
    // A state published before the device existed was dropped by the core:
    // everything again, then the widget showing it.
    await this.refresh({ republish: true });
    this.gladys.requestWidgetRefresh?.('airports');
  }

  // --- Refresh ----------------------------------------------------------------

  /** Polling fallback: Gladys does not poll these devices, but if it did. */
  async poll() {
    if (this.now() - this.refreshedAt >= (this.config.refreshSeconds * 1000) / 2) {
      await this.refresh();
    }
  }

  refresh(options = {}) {
    if (this.inflight) {
      // A read in progress may predate a device just created: one more read
      // after it, shared by every caller arriving meanwhile ("Add all" on ten
      // devices reads twice, not ten times).
      this.queuedRepublish ||= Boolean(options.republish);
      this.queued ??= this.inflight.then(() => {
        const republish = this.queuedRepublish;
        this.queued = null;
        this.queuedRepublish = false;
        return this.refresh({ republish });
      });
      return this.queued;
    }
    this.attemptedAt = this.now();
    this.inflight = this.doRefresh(options).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  async doRefresh({ republish = false } = {}) {
    const airports = this.createdAirports();
    if (airports.length === 0) {
      return;
    }
    let feed;
    try {
      feed = await this.faa.airportEvents();
    } catch (err) {
      if (!this.lastError) {
        logger.warn(`Cannot read the FAA: ${err.message}`);
        await this.gladys
          .setConnectionStatus(false, sayAll(TEXT, 'serviceDown', { error: err.message }))
          .catch(() => {});
      } else {
        logger.debug(`Cannot read the FAA: ${err.message}`);
      }
      this.lastError = err.message;
      // The last known states stay; the heartbeat keeps them fresh.
      await this.publishAll();
      return;
    }
    if (this.lastError) {
      logger.info('FAA reachable again');
      this.lastError = null;
      await this.gladys.setConnectionStatus(true).catch(() => {});
    }
    const now = this.now();
    this.refreshedAt = now;
    const parsed = parseFeed(feed, now);
    this.feedCount = parsed.size;
    logger.debug(`FAA read: events at ${parsed.size} airport(s)`);
    // An airport removed (or its device deleted) while the FAA was read: its
    // memory is dropped, so that coming back later is not compared with a
    // status of long ago.
    const created = new Set(this.createdAirports().map((airport) => airport.code));
    for (const code of this.flags.keys()) {
      if (!created.has(code)) {
        this.flags.delete(code);
      }
    }
    const events = [];
    for (const airport of airports) {
      if (!created.has(airport.code)) {
        continue;
      }
      const status = { ...(parsed.get(airport.code) ?? normalStatus(airport.code)), at: now };
      const previous = this.statuses.get(airport.code);
      this.statuses.set(airport.code, status);
      events.push(...this.detect(airport, status, previous));
    }
    await this.publishAll({ force: republish });
    for (const data of events) {
      await this.fire(TRIGGERS.CHANGED, data);
    }
  }

  async publishAll({ force = false } = {}) {
    const language = this.config.language;
    const now = this.now();
    const states = this.createdAirports()
      .filter((airport) => this.statuses.has(airport.code))
      .flatMap((airport) =>
        airportStates(this.gladys, airport.code, this.statuses.get(airport.code), language, now),
      );
    if (states.length === 0) {
      return;
    }
    if (force) {
      this.gladys.forgetPublishedStates?.();
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      // Gladys restarting: said once, the next refresh sends them again.
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  // --- Scene trigger ----------------------------------------------------------

  /** The events of an airport since the previous read: declared, lifted. */
  detect(airport, status, previousStatus) {
    const current = flagsOf(status);
    const previous = this.flags.get(airport.code);
    this.flags.set(airport.code, current);
    if (!previous) {
      return [];
    }
    const language = this.config.language;
    const now = this.now();
    const pairs = [
      ['closed', 'closed', 'reopened', status.closure],
      ['groundStop', 'ground_stop_declared', 'ground_stop_lifted', status.groundStop],
      ['delay', 'delay_declared', 'delay_lifted', status.groundDelay],
    ];
    const events = [];
    for (const [flag, declared, lifted, event] of pairs) {
      if (previous[flag] === current[flag]) {
        continue;
      }
      events.push({
        airport: this.deviceId(airport),
        event: current[flag] ? declared : lifted,
        airport_code: airport.code,
        airport_name: airportLabel(airport),
        status: statusText(status, language, now),
        level: status.level,
        previous_level: previousStatus?.level ?? 0,
        reason: reasonText(status, language),
        departure_delay: departureDelay(status).average,
        arrival_delay: arrivalDelay(status).average,
        until: current[flag] ? localTime(event?.end, language, now) : '',
      });
    }
    return events;
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
      }
    } catch (err) {
      // A 429 or Gladys restarting: said once per streak.
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- Readings for the widget and the scene action ---------------------------

  /** Reads again when a created airport has no status or one older than two intervals. */
  async freshen(airports) {
    const interval = this.config.refreshSeconds * 1000;
    const stale = airports.some((airport) => {
      const at = this.statuses.get(airport.code)?.at;
      return this.isCreated(this.deviceId(airport)) && (!at || this.now() - at > interval * 2);
    });
    // The FAA down or just tried: no read per widget load nor scene action.
    if (stale && !(this.attemptedAt && this.now() - this.attemptedAt < interval)) {
      await this.refresh();
    }
  }

  /** The airport and status of a device, or null when it is not followed. */
  async statusOf(externalId) {
    const airport = this.airportOfDevice(externalId);
    if (!airport) {
      return null;
    }
    await this.freshen([airport]);
    return { airport, status: this.statuses.get(airport.code) ?? null };
  }

  // --- Configuration actions -------------------------------------------------

  /** Answers an expected failure with a message in every language. */
  fail(key, params) {
    const err = new Error(key);
    err.messages = sayAll(TEXT, key, params);
    return err;
  }

  async addAirport({ airport: query } = {}) {
    const text = String(query ?? '').trim();
    if (!text) {
      return sayAll(TEXT, 'needText');
    }
    const found = findAirports(text);
    if (found.length === 0) {
      throw this.fail('unknown', { query: text });
    }
    if (found.length > 1) {
      return each(
        (lang) =>
          `${say(TEXT, lang, 'ambiguous')}\n${found
            .map((airport) => `• ${airportLabel(airport)}`)
            .join('\n')}`,
      );
    }
    const [airport] = found;
    const label = airportLabel(airport);
    if (this.airports.some((known) => known.code === airport.code)) {
      return sayAll(TEXT, 'already', { name: label });
    }
    if (this.airports.length >= MAX_AIRPORTS) {
      throw this.fail('tooMany', { max: MAX_AIRPORTS });
    }
    this.airports.push(airport);
    this.removed = this.removed.filter((code) => code !== airport.code);
    await this.save();
    await this.publishDiscovered();
    logger.info(`Airport followed: ${label}`);
    const major = Boolean(MAJOR_AIRPORTS[airport.code]);
    return each(
      (lang) =>
        `${say(TEXT, lang, 'added', { name: label })}${major ? '' : `\n${say(TEXT, lang, 'notMajor')}`}`,
    );
  }

  async removeAirport({ airport: query } = {}) {
    const text = String(query ?? '').trim();
    const wanted = fold(text);
    const upper = text.toUpperCase();
    const airport =
      this.airports.find((known) => known.code === upper || `K${known.code}` === upper) ??
      this.airports.find(
        (known) =>
          fold(airportLabel(known)) === wanted || (known.name && fold(known.name) === wanted),
      );
    if (!airport) {
      throw this.fail('notFollowed', { query: text });
    }
    this.airports = this.airports.filter((known) => known !== airport);
    this.statuses.delete(airport.code);
    this.flags.delete(airport.code);
    if (!this.removed.includes(airport.code)) {
      this.removed.push(airport.code);
    }
    await this.save();
    await this.publishDiscovered();
    logger.info(`Airport no longer followed: ${airportLabel(airport)}`);
    return sayAll(TEXT, 'removed', { name: airportLabel(airport) });
  }

  status() {
    const now = this.now();
    return each((lang) => {
      if (this.airports.length === 0) {
        return say(TEXT, lang, 'statusNone');
      }
      const out = [say(TEXT, lang, 'statusAirports', { count: this.airports.length })];
      for (const airport of this.airports) {
        const status = this.statuses.get(airport.code);
        const current = status ? ` · ${statusText(status, lang, now)}` : '';
        const created = say(
          TEXT,
          lang,
          this.isCreated(this.deviceId(airport)) ? 'statusCreated' : 'statusNotCreated',
        );
        out.push(`• ${airportLabel(airport)}${current} — ${created}`);
      }
      if (this.refreshedAt) {
        out.push(
          say(TEXT, lang, 'statusRefreshed', {
            age: Math.round((now - this.refreshedAt) / 1000),
            count: this.feedCount,
          }),
        );
      } else if (this.createdAirports().length === 0) {
        out.push(say(TEXT, lang, 'statusNeverRefreshed'));
      }
      if (this.lastError) {
        out.push(say(TEXT, lang, 'statusError', { error: this.lastError }));
      }
      return out.join('\n');
    });
  }
}
