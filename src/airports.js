// -----------------------------------------------------------------------------
// The airports a user can follow. The FAA feed only lists airports with an
// event, so it cannot say whether a code exists: the 77 airports of the FAA's
// ASPM performance program (where nearly every ground stop and delay program
// happens) are known by name, and any other well-formed code is accepted as
// typed (the FAA also files events for smaller US airports and, for ground
// delay programs, Canadian ones).
// -----------------------------------------------------------------------------

import { fold } from './text.js';

/** Code → name, as travellers say it. Place names do not translate. */
export const MAJOR_AIRPORTS = {
  ABQ: 'Albuquerque',
  ANC: 'Anchorage',
  ATL: 'Atlanta',
  AUS: 'Austin',
  BDL: 'Hartford Bradley',
  BHM: 'Birmingham',
  BNA: 'Nashville',
  BOS: 'Boston Logan',
  BUF: 'Buffalo',
  BUR: 'Burbank',
  BWI: 'Baltimore/Washington',
  CLE: 'Cleveland',
  CLT: 'Charlotte',
  CVG: 'Cincinnati',
  DAL: 'Dallas Love Field',
  DAY: 'Dayton',
  DCA: 'Washington Reagan',
  DEN: 'Denver',
  DFW: 'Dallas/Fort Worth',
  DTW: 'Detroit',
  EWR: 'Newark',
  FLL: 'Fort Lauderdale',
  GYY: 'Gary/Chicago',
  HNL: 'Honolulu',
  HOU: 'Houston Hobby',
  HPN: 'Westchester County',
  IAD: 'Washington Dulles',
  IAH: 'Houston Intercontinental',
  IND: 'Indianapolis',
  ISP: 'Long Island MacArthur',
  JAX: 'Jacksonville',
  JFK: 'New York JFK',
  LAS: 'Las Vegas',
  LAX: 'Los Angeles',
  LGA: 'New York LaGuardia',
  LGB: 'Long Beach',
  MCI: 'Kansas City',
  MCO: 'Orlando',
  MDW: 'Chicago Midway',
  MEM: 'Memphis',
  MHT: 'Manchester',
  MIA: 'Miami',
  MKE: 'Milwaukee',
  MSP: 'Minneapolis-Saint Paul',
  MSY: 'New Orleans',
  OAK: 'Oakland',
  OGG: 'Kahului (Maui)',
  OMA: 'Omaha',
  ONT: 'Ontario (California)',
  ORD: "Chicago O'Hare",
  OXR: 'Oxnard',
  PBI: 'West Palm Beach',
  PDX: 'Portland',
  PHL: 'Philadelphia',
  PHX: 'Phoenix',
  PIT: 'Pittsburgh',
  PSP: 'Palm Springs',
  PVD: 'Providence',
  RDU: 'Raleigh-Durham',
  RFD: 'Rockford',
  RSW: 'Fort Myers',
  SAN: 'San Diego',
  SAT: 'San Antonio',
  SDF: 'Louisville',
  SEA: 'Seattle-Tacoma',
  SFO: 'San Francisco',
  SJC: 'San José',
  SJU: 'San Juan',
  SLC: 'Salt Lake City',
  SMF: 'Sacramento',
  SNA: 'Santa Ana (Orange County)',
  STL: 'St. Louis',
  SWF: 'New York Stewart',
  TEB: 'Teterboro',
  TPA: 'Tampa',
  TUS: 'Tucson',
  VNY: 'Van Nuys',
};

// FAA location identifiers: three letters or digits ("JFK", "1O5").
const CODE = /^[A-Z0-9]{3}$/;

/**
 * The airports matching what the user typed: a code (known or not), a major
 * airport whose name contains the text, or an ICAO code of the contiguous US
 * ("KJFK" → "JFK").
 * @returns {{ code: string, name: string }[]}
 */
export function findAirports(text) {
  const upper = String(text ?? '')
    .trim()
    .toUpperCase();
  if (CODE.test(upper)) {
    return [{ code: upper, name: MAJOR_AIRPORTS[upper] ?? '' }];
  }
  const wanted = fold(text);
  const byName =
    wanted.length >= 3
      ? Object.entries(MAJOR_AIRPORTS)
          .filter(([, name]) => fold(name).includes(wanted))
          .map(([code, name]) => ({ code, name }))
      : [];
  if (byName.length > 0) {
    return byName;
  }
  const icao = /^K[A-Z0-9]{3}$/.test(upper) ? upper.slice(1) : null;
  return icao ? [{ code: icao, name: MAJOR_AIRPORTS[icao] ?? '' }] : [];
}

/** "JFK · New York JFK", or the code alone. */
export const airportLabel = (airport) =>
  airport.name ? `${airport.code} · ${airport.name}` : airport.code;
