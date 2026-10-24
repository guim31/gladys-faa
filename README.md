# FAA Airport Status for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) external integration for **US airports**: ground
stops, ground delay programs, departure and arrival delays and closures, as the Federal Aviation
Administration publishes them on [FAA NAS Status](https://nasstatus.faa.gov). No account, no key.

> **Developed outside the United States: feedback welcome.** The integration is built and tested
> on real FAA answers (a summer thunderstorm day, a winter storm, a quiet morning) and its
> container was run against the live feed; it has not yet run in many Gladys installations. Please
> report what works and what does not in the [issues](https://github.com/guim31/gladys-faa/issues)
> or on the Gladys forum.

## What it does

- **A device per followed airport** (by FAA code, ICAO code or city): status in words, disruption
  level 0 to 3, delays / ground stop / ground delay program / closure as yes/no, average and
  maximum departure and arrival delays in minutes, cause.
- **Dashboard widget** _US airport status_: every followed airport, the most disrupted first.
- **Scene trigger** _Airport status changed_: closed, reopened, ground stop declared or lifted,
  delays declared or over.
- **Scene action** _Get an airport status_, with a sentence ready to send.
- Texts in English, French, German and Spanish.

The user documentation is in [`docs/en.md`](docs/en.md) ([fr](docs/fr.md), [de](docs/de.md),
[es](docs/es.md)).

## Requirements

- Gladys Assistant 5.1.0 or later, with internet access.

## Installation

1. In Gladys, open **Integrations → Install from GitHub**.
2. Paste `https://github.com/guim31/gladys-faa` and install.
3. In the integration's **Configuration** tab, use **Follow an airport** (`JFK`, `ATL`,
   `San Francisco`…), then create the devices in the **Discover** tab.

## How it works

Every 5 minutes (or 10), and only when an airport device is created, the integration reads
`https://nasstatus.faa.gov/api/airport-events` once for every followed airport: the JSON of the
FAA's NAS Status page, which lists the airports with an event. It prefers it to the older XML
(`api/airport-status-information`), which files every restriction for general aviation
(“AD AP CLSD TO ... GA ACFT”) as an airport closure. Recurring closures (“DLY 0430-0945”) count only
during their hours. Only `/data/airports.json` is written: the followed airports.

## Limits

- United States only (and the few Canadian delay programs the FAA files).
- Airport-level delays, not flight-level ones.
- Feature names are set when the device is created.
- Up to 20 airports.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests run against the SDK's fake Gladys and real FAA answers in `test/fixtures/faa` (three
archived by the Wayback Machine, one read for this integration); they never touch the network. See
[`CLAUDE.md`](CLAUDE.md) for the project rules.

## Credits

- Data: [FAA NAS Status](https://nasstatus.faa.gov), a public service of the Federal Aviation
  Administration.
- Cover: the FAA logo from
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Logo_of_the_Federal_Aviation_Administration.svg)
  (a work of the US Department of Transportation, public domain), on a white disc over the FAA
  blue.
- Inspired by the Home Assistant [FAA Delays](https://www.home-assistant.io/integrations/faa_delays/)
  integration (Apache 2.0) and its `faadelays` library, and by the `gladys-tfl` integration.

Not affiliated with nor endorsed by the Federal Aviation Administration.
