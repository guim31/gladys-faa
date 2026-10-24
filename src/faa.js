// -----------------------------------------------------------------------------
// The FAA NAS Status feed (https://nasstatus.faa.gov), open, without a key: the
// airports where something is going on right now (ground stops, ground delay
// programs, departure and arrival delays, closures). An airport absent from
// the answer runs normally.
//
// `api/airport-events` is the JSON the FAA's own NAS Status page reads. It is
// preferred to the older XML (`api/airport-status-information`): the XML lists
// every "AD AP CLSD TO ... GA ACFT" NOTAM as an airport closure, so LAX or SAN
// would show as closed for months, while the JSON files them under `freeForm`
// and keeps `airportClosure` for real closures.
// -----------------------------------------------------------------------------

export const API_URL = 'https://nasstatus.faa.gov/api/airport-events';
const HOST = 'nasstatus.faa.gov';
const TIMEOUT_MS = 20000;
const USER_AGENT = 'gladys-faa (+https://github.com/guim31/gladys-faa)';

export class FaaError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export class Faa {
  /**
   * @param {object} [options]
   * @param {typeof fetch} [options.fetch]
   */
  constructor({ fetch: fetchImpl = globalThis.fetch } = {}) {
    this.fetch = fetchImpl;
  }

  /**
   * Every airport with an event, as the FAA sends it.
   * @returns {Promise<object[]>}
   */
  async airportEvents() {
    let response;
    try {
      response = await this.fetch(API_URL, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new FaaError(`${HOST}: ${err.name === 'TimeoutError' ? 'timeout' : 'unreachable'}`);
    }
    if (!response.ok) {
      throw new FaaError(`${HOST}: HTTP ${response.status}`, response.status);
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new FaaError(`${HOST}: invalid JSON`);
    }
    // Anything but a list (an error page served with a 200) is not "all normal".
    if (!Array.isArray(body)) {
      throw new FaaError(`${HOST}: unexpected answer`);
    }
    return body.filter((airport) => typeof airport?.airportId === 'string');
  }
}
