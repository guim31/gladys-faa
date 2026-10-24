# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Follow US airports from the FAA NAS Status feed (no account, no key), by
  FAA code, ICAO code or city. A device per airport: status in words,
  disruption level 0 to 3, delays, ground stop, ground delay program and
  closure as yes/no, average and maximum departure and arrival delays in
  minutes, cause.
- Configuration actions: follow an airport, stop following it, show what is
  followed.
- Dashboard widget "US airport status".
- Scene trigger "Airport status changed": closed, reopened, ground stop
  declared or lifted, delays declared or over.
- Scene action "Get an airport status", with a sentence ready to send.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-faa/commits/main
