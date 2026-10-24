// -----------------------------------------------------------------------------
// Scene action (manifest `scene_actions`, Gladys 5.1+).
//
// - get_airport_status: the status of a followed airport, as numbers for a
//   "Continue only if" step (level, yes/no as 1/0, delays in minutes) and as a
//   sentence ready for a message or a speaker ("JFK · New York JFK: Ground
//   stop until 22:45. Cause: Thunderstorms.").
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers, never booleans:
// the core's "Continue only if" compares with ===, and its value field only
// produces numbers and strings (Gladys 5.2.0).
// -----------------------------------------------------------------------------

import { airportLabel } from './airports.js';
import { reasonText, statusText } from './devices.js';
import { TEXT, levelName, say } from './messages.js';
import { SceneError } from './service.js';
import { arrivalDelay, departureDelay } from './status.js';
import { clip } from './text.js';

export const SCENE_ACTIONS = {
  async get_airport_status(service, { fields }) {
    const language = service.config.language;
    const found = await service.statusOf(fields.airport);
    if (!found) {
      throw new SceneError(say(TEXT, language, 'gone'));
    }
    if (!found.status) {
      throw new SceneError(say(TEXT, language, 'unavailable'));
    }
    const { airport, status } = found;
    const now = service.now();
    const name = airportLabel(airport);
    const text = statusText(status, language, now);
    const reason = status.level > 0 || status.closure ? reasonText(status, language) : '';
    const departure = departureDelay(status);
    const arrival = arrivalDelay(status);
    return {
      sentence: clip(
        `${say(TEXT, language, 'sentence', { airport: name, status: text })}${
          reason ? ` ${say(TEXT, language, 'causeSentence', { cause: reason })}` : ''
        }`,
        1000,
      ),
      airport_code: airport.code,
      airport_name: name,
      status: text,
      level: status.level,
      level_name: levelName(status.level, language),
      delayed: status.delayed ? 1 : 0,
      ground_stop: status.groundStop ? 1 : 0,
      ground_delay: status.groundDelay ? 1 : 0,
      closed: status.closure ? 1 : 0,
      departure_delay: departure.average,
      departure_delay_max: departure.maximum,
      arrival_delay: arrival.average,
      arrival_delay_max: arrival.maximum,
      reason,
    };
  },
};
