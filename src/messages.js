// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, action messages, widget
// contents, scene outputs), in the four languages of the Gladys interface.
// Entries are strings or functions of one parameter object. German says "du",
// Spanish "usted". Airport and place names never translate; the NOTAM of a
// closure stays as the FAA writes it.
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialisation failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Feature names (frozen when the device is created, in the configured language).
export const NAMES = {
  en: {
    status: 'Status',
    level: 'Disruption level',
    delayed: 'Delays',
    ground_stop: 'Ground stop',
    ground_delay: 'Ground delay program',
    closed: 'Closure',
    departure_delay: 'Departure delay (average)',
    departure_delay_max: 'Departure delay (maximum)',
    arrival_delay: 'Arrival delay (average)',
    arrival_delay_max: 'Arrival delay (maximum)',
    reason: 'Cause',
  },
  fr: {
    status: 'État',
    level: 'Niveau de perturbation',
    delayed: 'Retards',
    ground_stop: 'Arrêt au sol',
    ground_delay: 'Programme de retards au sol',
    closed: 'Fermeture',
    departure_delay: 'Retard au départ (moyen)',
    departure_delay_max: 'Retard au départ (maximal)',
    arrival_delay: "Retard à l'arrivée (moyen)",
    arrival_delay_max: "Retard à l'arrivée (maximal)",
    reason: 'Motif',
  },
  de: {
    status: 'Status',
    level: 'Störungsstufe',
    delayed: 'Verspätungen',
    ground_stop: 'Ground Stop',
    ground_delay: 'Ground Delay Program',
    closed: 'Schließung',
    departure_delay: 'Abflugverspätung (Durchschnitt)',
    departure_delay_max: 'Abflugverspätung (Maximum)',
    arrival_delay: 'Ankunftsverspätung (Durchschnitt)',
    arrival_delay_max: 'Ankunftsverspätung (Maximum)',
    reason: 'Ursache',
  },
  es: {
    status: 'Estado',
    level: 'Nivel de incidencia',
    delayed: 'Retrasos',
    ground_stop: 'Parada en tierra',
    ground_delay: 'Programa de retrasos en tierra',
    closed: 'Cierre',
    departure_delay: 'Retraso de salidas (medio)',
    departure_delay_max: 'Retraso de salidas (máximo)',
    arrival_delay: 'Retraso de llegadas (medio)',
    arrival_delay_max: 'Retraso de llegadas (máximo)',
    reason: 'Causa',
  },
};

// The levels of src/status.js, 0 to 3.
export const LEVEL_NAMES = {
  en: ['Normal operations', 'Delays', 'Ground delay program', 'Ground stop or closure'],
  fr: ['Trafic normal', 'Retards', 'Programme de retards au sol', 'Arrêt au sol ou fermeture'],
  de: ['Normaler Betrieb', 'Verspätungen', 'Ground Delay Program', 'Ground Stop oder Schließung'],
  es: [
    'Operaciones normales',
    'Retrasos',
    'Programa de retrasos en tierra',
    'Parada en tierra o cierre',
  ],
};

// The causes of src/status.js CAUSES.
export const CAUSES = {
  en: {
    thunderstorms: 'Thunderstorms',
    wind: 'Wind',
    low_ceilings: 'Low clouds',
    visibility: 'Low visibility',
    snow_ice: 'Snow or ice',
    rain: 'Rain',
    weather: 'Weather',
    volume: 'Heavy traffic',
    runway: 'Runway works',
    equipment: 'Equipment outage',
    staffing: 'Staffing',
    security: 'Security',
    vip: 'VIP movement',
    air_show: 'Air show',
    other: 'Other',
  },
  fr: {
    thunderstorms: 'Orages',
    wind: 'Vent',
    low_ceilings: 'Plafond bas',
    visibility: 'Visibilité réduite',
    snow_ice: 'Neige ou glace',
    rain: 'Pluie',
    weather: 'Météo',
    volume: 'Trafic chargé',
    runway: 'Travaux de piste',
    equipment: "Panne d'équipement",
    staffing: 'Effectifs',
    security: 'Sûreté',
    vip: 'Déplacement officiel',
    air_show: 'Meeting aérien',
    other: 'Autre',
  },
  de: {
    thunderstorms: 'Gewitter',
    wind: 'Wind',
    low_ceilings: 'Tiefe Wolken',
    visibility: 'Schlechte Sicht',
    snow_ice: 'Schnee oder Eis',
    rain: 'Regen',
    weather: 'Wetter',
    volume: 'Hohes Verkehrsaufkommen',
    runway: 'Pistenarbeiten',
    equipment: 'Technische Störung',
    staffing: 'Personalmangel',
    security: 'Sicherheit',
    vip: 'VIP-Bewegung',
    air_show: 'Flugshow',
    other: 'Sonstiges',
  },
  es: {
    thunderstorms: 'Tormentas',
    wind: 'Viento',
    low_ceilings: 'Nubes bajas',
    visibility: 'Visibilidad reducida',
    snow_ice: 'Nieve o hielo',
    rain: 'Lluvia',
    weather: 'Meteorología',
    volume: 'Tráfico intenso',
    runway: 'Obras en pista',
    equipment: 'Avería de equipos',
    staffing: 'Falta de personal',
    security: 'Seguridad',
    vip: 'Movimiento oficial',
    air_show: 'Exhibición aérea',
    other: 'Otra',
  },
};

export const TEXT = {
  en: {
    needText: 'Type an airport code (JFK, ATL, SFO…) or a city name.',
    unknown: ({ query }) =>
      `No airport matches “${query}”. Type its three-letter FAA code (JFK, ORD…).`,
    ambiguous: 'Several airports match: type the code of yours.',
    added: ({ name }) => `${name} followed.\nOpen the Discover tab to create its device.`,
    notMajor:
      'Not one of the 77 major airports the FAA tracks: it shows events only if the FAA files some.',
    already: ({ name }) => `${name} is already followed.`,
    tooMany: ({ max }) => `You already follow ${max} airports: remove one first.`,
    notFollowed: ({ query }) => `No followed airport matches “${query}”.`,
    removed: ({ name }) =>
      `${name} is no longer followed. Delete its device in Gladys if you no longer need it.`,
    statusNone: 'No airport followed yet.',
    statusAirports: ({ count }) => `${count} airport(s) followed:`,
    statusCreated: 'device created',
    statusNotCreated: 'device not created yet (Discover tab)',
    statusRefreshed: ({ age, count }) =>
      `Last read ${age} s ago: the FAA reports events at ${count} airport(s) in the United States.`,
    statusNeverRefreshed: 'Not read yet (no device created).',
    statusError: ({ error }) => `Last error: ${error}.`,
    serviceDown: ({ error }) => `The FAA does not answer (${error}).`,
    normal: 'Normal operations',
    closed: 'Closed',
    closedUntil: ({ time }) => `Closed until ${time}`,
    groundStop: 'Ground stop',
    groundStopUntil: ({ time }) => `Ground stop until ${time}`,
    program: ({ average }) => `Ground delay program, ${average} min on average`,
    shortProgram: ({ average }) => `Delay program, ${average} min`,
    departures: ({ range }) => `Departures ${range}`,
    arrivals: ({ range }) => `Arrivals ${range}`,
    closureReason: 'Closure (NOTAM)',
    noDisruption: 'No disruption',
    heading: 'FAA airport status',
    noAirports: 'Follow an airport with the “Follow an airport” action, then create its device.',
    loading: 'Reading the FAA…',
    allGood: 'Normal operations at every followed airport.',
    gone: 'This airport is no longer followed.',
    unavailable: 'The FAA has not answered yet: try again in a few minutes.',
    sentence: ({ airport, status }) => `${airport}: ${status}.`,
    causeSentence: ({ cause }) => `Cause: ${cause}.`,
  },
  fr: {
    needText: 'Tapez un code d’aéroport (JFK, ATL, SFO…) ou un nom de ville.',
    unknown: ({ query }) =>
      `Aucun aéroport ne correspond à « ${query} ». Tapez son code FAA à trois lettres (JFK, ORD…).`,
    ambiguous: 'Plusieurs aéroports correspondent : tapez le code du vôtre.',
    added: ({ name }) => `${name} suivi.\nOuvrez l'onglet Découverte pour créer son appareil.`,
    notMajor:
      "Il ne fait pas partie des 77 grands aéroports suivis par la FAA : il n'aura d'événements que si la FAA en publie.",
    already: ({ name }) => `${name} est déjà suivi.`,
    tooMany: ({ max }) => `Vous suivez déjà ${max} aéroports : retirez-en un d'abord.`,
    notFollowed: ({ query }) => `Aucun aéroport suivi ne correspond à « ${query} ».`,
    removed: ({ name }) =>
      `${name} n'est plus suivi. Supprimez son appareil dans Gladys si vous n'en avez plus besoin.`,
    statusNone: 'Aucun aéroport suivi pour le moment.',
    statusAirports: ({ count }) => `${count} aéroport(s) suivi(s) :`,
    statusCreated: 'appareil créé',
    statusNotCreated: 'appareil pas encore créé (onglet Découverte)',
    statusRefreshed: ({ age, count }) =>
      `Dernière lecture il y a ${age} s : la FAA signale des événements sur ${count} aéroport(s) aux États-Unis.`,
    statusNeverRefreshed: 'Pas encore lu (aucun appareil créé).',
    statusError: ({ error }) => `Dernière erreur : ${error}.`,
    serviceDown: ({ error }) => `La FAA ne répond pas (${error}).`,
    normal: 'Trafic normal',
    closed: 'Fermé',
    closedUntil: ({ time }) => `Fermé jusqu'à ${time}`,
    groundStop: 'Arrêt au sol',
    groundStopUntil: ({ time }) => `Arrêt au sol jusqu'à ${time}`,
    program: ({ average }) => `Programme de retards au sol, ${average} min en moyenne`,
    shortProgram: ({ average }) => `Régulation, ${average} min`,
    departures: ({ range }) => `Départs ${range}`,
    arrivals: ({ range }) => `Arrivées ${range}`,
    closureReason: 'Fermeture (NOTAM)',
    noDisruption: 'Aucune perturbation',
    heading: 'État des aéroports (FAA)',
    noAirports: "Suivez un aéroport avec l'action « Suivre un aéroport », puis créez son appareil.",
    loading: 'Lecture de la FAA…',
    allGood: 'Trafic normal dans tous les aéroports suivis.',
    gone: "Cet aéroport n'est plus suivi.",
    unavailable: "La FAA n'a pas encore répondu : réessayez dans quelques minutes.",
    sentence: ({ airport, status }) => `${airport} : ${status}.`,
    causeSentence: ({ cause }) => `Motif : ${cause}.`,
  },
  de: {
    needText: 'Gib einen Flughafencode (JFK, ATL, SFO…) oder einen Städtenamen ein.',
    unknown: ({ query }) =>
      `Kein Flughafen passt zu „${query}“. Gib seinen dreistelligen FAA-Code ein (JFK, ORD…).`,
    ambiguous: 'Mehrere Flughäfen passen: Gib den Code deines Flughafens ein.',
    added: ({ name }) =>
      `${name} wird verfolgt.\nÖffne den Tab „Entdecken“, um sein Gerät anzulegen.`,
    notMajor:
      'Er gehört nicht zu den 77 großen Flughäfen, die die FAA verfolgt: Ereignisse gibt es nur, wenn die FAA welche meldet.',
    already: ({ name }) => `${name} wird bereits verfolgt.`,
    tooMany: ({ max }) => `Du verfolgst bereits ${max} Flughäfen: Entferne zuerst einen.`,
    notFollowed: ({ query }) => `Kein verfolgter Flughafen passt zu „${query}“.`,
    removed: ({ name }) =>
      `${name} wird nicht mehr verfolgt. Lösche sein Gerät in Gladys, wenn du es nicht mehr brauchst.`,
    statusNone: 'Noch kein Flughafen verfolgt.',
    statusAirports: ({ count }) => `Verfolgte Flughäfen (${count}):`,
    statusCreated: 'Gerät angelegt',
    statusNotCreated: 'Gerät noch nicht angelegt (Tab „Entdecken“)',
    statusRefreshed: ({ age, count }) =>
      `Zuletzt vor ${age} s gelesen: Die FAA meldet Ereignisse an US-Flughäfen (${count}).`,
    statusNeverRefreshed: 'Noch nicht gelesen (kein Gerät angelegt).',
    statusError: ({ error }) => `Letzter Fehler: ${error}.`,
    serviceDown: ({ error }) => `Die FAA antwortet nicht (${error}).`,
    normal: 'Normaler Betrieb',
    closed: 'Geschlossen',
    closedUntil: ({ time }) => `Geschlossen bis ${time}`,
    groundStop: 'Ground Stop',
    groundStopUntil: ({ time }) => `Ground Stop bis ${time}`,
    program: ({ average }) => `Ground Delay Program, im Schnitt ${average} min`,
    shortProgram: ({ average }) => `Delay Program, ${average} min`,
    departures: ({ range }) => `Abflüge ${range}`,
    arrivals: ({ range }) => `Ankünfte ${range}`,
    closureReason: 'Schließung (NOTAM)',
    noDisruption: 'Keine Störung',
    heading: 'Flughafenstatus (FAA)',
    noAirports:
      'Verfolge einen Flughafen mit der Aktion „Flughafen verfolgen“ und lege dann sein Gerät an.',
    loading: 'FAA wird gelesen…',
    allGood: 'Normaler Betrieb an allen verfolgten Flughäfen.',
    gone: 'Dieser Flughafen wird nicht mehr verfolgt.',
    unavailable: 'Die FAA hat noch nicht geantwortet: Versuche es in ein paar Minuten erneut.',
    sentence: ({ airport, status }) => `${airport}: ${status}.`,
    causeSentence: ({ cause }) => `Ursache: ${cause}.`,
  },
  es: {
    needText: 'Escriba un código de aeropuerto (JFK, ATL, SFO…) o el nombre de una ciudad.',
    unknown: ({ query }) =>
      `Ningún aeropuerto coincide con «${query}». Escriba su código FAA de tres letras (JFK, ORD…).`,
    ambiguous: 'Varios aeropuertos coinciden: escriba el código del suyo.',
    added: ({ name }) => `${name} seguido.\nAbra la pestaña Descubrir para crear su dispositivo.`,
    notMajor:
      'No es uno de los 77 grandes aeropuertos que sigue la FAA: solo tendrá eventos si la FAA los publica.',
    already: ({ name }) => `${name} ya se sigue.`,
    tooMany: ({ max }) => `Ya sigue ${max} aeropuertos: elimine uno primero.`,
    notFollowed: ({ query }) => `Ningún aeropuerto seguido coincide con «${query}».`,
    removed: ({ name }) =>
      `${name} ya no se sigue. Borre su dispositivo en Gladys si ya no lo necesita.`,
    statusNone: 'Todavía no sigue ningún aeropuerto.',
    statusAirports: ({ count }) => `${count} aeropuerto(s) seguido(s):`,
    statusCreated: 'dispositivo creado',
    statusNotCreated: 'dispositivo aún no creado (pestaña Descubrir)',
    statusRefreshed: ({ age, count }) =>
      `Última lectura hace ${age} s: la FAA señala eventos en ${count} aeropuerto(s) de Estados Unidos.`,
    statusNeverRefreshed: 'Aún no leído (ningún dispositivo creado).',
    statusError: ({ error }) => `Último error: ${error}.`,
    serviceDown: ({ error }) => `La FAA no responde (${error}).`,
    normal: 'Operaciones normales',
    closed: 'Cerrado',
    closedUntil: ({ time }) => `Cerrado hasta ${time}`,
    groundStop: 'Parada en tierra',
    groundStopUntil: ({ time }) => `Parada en tierra hasta ${time}`,
    program: ({ average }) => `Programa de retrasos en tierra, ${average} min de media`,
    shortProgram: ({ average }) => `Programa de retrasos, ${average} min`,
    departures: ({ range }) => `Salidas ${range}`,
    arrivals: ({ range }) => `Llegadas ${range}`,
    closureReason: 'Cierre (NOTAM)',
    noDisruption: 'Ninguna incidencia',
    heading: 'Estado de aeropuertos (FAA)',
    noAirports: 'Siga un aeropuerto con la acción «Seguir un aeropuerto» y cree su dispositivo.',
    loading: 'Leyendo la FAA…',
    allGood: 'Operaciones normales en todos los aeropuertos seguidos.',
    gone: 'Este aeropuerto ya no se sigue.',
    unavailable: 'La FAA aún no ha respondido: inténtelo de nuevo dentro de unos minutos.',
    sentence: ({ airport, status }) => `${airport}: ${status}.`,
    causeSentence: ({ cause }) => `Causa: ${cause}.`,
  },
};

/** One text of a table, in `language` (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** One text of a table in the four languages: { en, fr, de, es }. */
export function sayAll(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** The name of a cause, "Thunderstorms". */
export const causeName = (cause, language) =>
  (CAUSES[language] ?? CAUSES.en)[cause] ?? CAUSES.en.other;

/** The name of a level, "Ground stop or closure". */
export const levelName = (level, language) => (LEVEL_NAMES[language] ?? LEVEL_NAMES.en)[level];
