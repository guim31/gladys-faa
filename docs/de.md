# FAA Airport Status

Der Status der US-Flughäfen in Gladys, so wie die Federal Aviation Administration (FAA) ihn
veröffentlicht: Ground Stops, Ground Delay Programs, Abflug- und Ankunftsverspätungen und
Schließungen. Praktisch vor einer Reise in die oder aus den USA oder um den Flughafen des Flugs
eines Angehörigen im Blick zu behalten.

Die Daten stammen von [FAA NAS Status](https://nasstatus.faa.gov), dem offenen Feed der FAA zum
US-Luftraum: **kein Konto, kein Schlüssel**. Diese Integration ist nicht mit der FAA verbunden.

> **Außerhalb der USA entwickelt: Rückmeldungen willkommen.** Die Integration ist mit echten Antworten der FAA
> gebaut und getestet (ein Gewittertag im Sommer, ein Wintersturm, ein ruhiger Morgen), und ihr
> Container lief gegen den echten Feed; in vielen Gladys-Installationen lief sie noch nicht.

## Was du bekommst

- **Ein Gerät pro verfolgtem Flughafen** (JFK, ATL, SFO… oder jeder FAA-Code): sein Status in
  Worten, eine Störungsstufe von 0 bis 3, vier Ja/Nein (Verspätungen, Ground Stop, Ground Delay
  Program, Schließung), die durchschnittliche und maximale Verspätung der Abflüge und Ankünfte in
  Minuten und die Ursache (Gewitter, Wind, tiefe Wolken, hohes Verkehrsaufkommen…).
- **Ein Dashboard-Widget**: der Status jedes verfolgten Flughafens, der am stärksten gestörte
  zuerst.
- **Ein Szenen-Auslöser**: Die FAA meldet oder beendet Verspätungen, einen Ground Stop oder eine
  Schließung.
- **Eine Szenen-Aktion**: den Status eines Flughafens lesen, mit einem fertigen Satz für eine
  Nachricht oder einen Lautsprecher.

## Voraussetzungen

- Gladys Assistant 5.1.0 oder neuer.
- Internetzugang vom Gladys-Rechner (die Integration ruft `nasstatus.faa.gov` auf).

## Installation

1. Öffne in Gladys **Integrationen → Von GitHub installieren**.
2. Füge `https://github.com/guim31/gladys-faa` ein und installiere.
3. Öffne den Tab **Konfiguration** der Integration, um Flughäfen zu verfolgen (siehe unten).

## Konfiguration

### Einstellungen

- **Sprache der Texte**: die Sprache der Funktionsnamen (beim Anlegen eines Geräts festgelegt),
  der Status, der Ursachen und der Sätze für deine Szenen.
- **Aktualisierungsintervall**: 5 Minuten (Standard) oder 10 Minuten. Eine einzige Anfrage
  bedient alle verfolgten Flughäfen.

### Einen Flughafen verfolgen

Nutze **Flughafen verfolgen** mit:

- seinem dreistelligen FAA-Code: `JFK`, `LGA`, `EWR`, `ATL`, `ORD`, `SFO`… (bei den meisten
  Flughäfen der Code auf deiner Bordkarte);
- oder seinem vierstelligen ICAO-Code in den kontinentalen USA: `KJFK`;
- oder dem Namen seiner Stadt: `Atlanta`, `San Francisco`. Passen mehrere Flughäfen (`Chicago`,
  `Washington`, `New York`), listet die Antwort sie auf: Verfolge deinen über seinen Code.

Die 77 großen Flughäfen, die die FAA verfolgt, sind mit Namen bekannt. Jeder andere Code wird so
übernommen, wie du ihn eingibst: Die FAA meldet auch Ereignisse für kleinere Flughäfen (meist
Schließungen) und Ground Delay Programs für einige kanadische Flughäfen (`YYZ`, `YUL`).

Öffne dann den Tab **Entdecken** und lege das Gerät an. Bis zu 20 Flughäfen.

### Entfernen, Status prüfen

- **Flughafen nicht mehr verfolgen**: Gib seinen Code ein. Das Gerät bleibt in Gladys, bis du es
  löschst.
- **Status**: listet die verfolgten Flughäfen, ihren aktuellen Status, ob ihr Gerät angelegt ist,
  und das letzte Lesen der FAA auf.

## Geräte

Jedes Flughafengerät hat diese Funktionen (Namen in der beim Anlegen gewählten Sprache):

| Funktion                          | Typ           | Wert                                                            |
| --------------------------------- | ------------- | --------------------------------------------------------------- |
| Status                            | Text          | „Ground Stop bis 23:45 · Abflüge 121–135 min ↗“                 |
| Störungsstufe                     | Stufe 0 bis 3 | 0 normal, 1 Verspätungen, 2 Delay Program, 3 Stopp/Schließung   |
| Verspätungen                      | Ja/Nein       | ein Ground Stop, ein Program, Abflug- oder Ankunftsverspätungen |
| Ground Stop                       | Ja/Nein       | Flüge zu diesem Flughafen bleiben am Abflugort                  |
| Ground Delay Program              | Ja/Nein       | Abflüge zu diesem Flughafen werden mit Wartezeiten dosiert      |
| Schließung                        | Ja/Nein       | gerade per NOTAM geschlossen                                    |
| Abflugverspätung (Durchschnitt)   | Minuten       | 0, wenn es keine gibt                                           |
| Abflugverspätung (Maximum)        | Minuten       | 0, wenn es keine gibt                                           |
| Ankunftsverspätung (Durchschnitt) | Minuten       | die größere aus Ankunftsverspätung und Program                  |
| Ankunftsverspätung (Maximum)      | Minuten       | ebenso                                                          |
| Ursache                           | Text          | „Gewitter“, „Schließung (NOTAM)“, „Keine Störung“               |

Die Uhrzeiten sind in der Zeitzone deines Gladys. Die Pfeile zeigen, ob die FAA mit wachsenden
(↗) oder sinkenden (↘) Verspätungen rechnet.

## Dashboard-Widget

**US-Flughafenstatus**: eine Zeile pro verfolgtem Flughafen (mit angelegtem Gerät), der am
stärksten gestörte zuerst: grün bei normalem Betrieb, orange bei Abflug- oder
Ankunftsverspätungen, rot bei einem Ground Delay Program, einem Ground Stop oder einer Schließung.
Die Bildunterschrift nennt die Ursachen.

## Szenen-Auslöser

**Flughafenstatus geändert**: löst aus, wenn die FAA an einem verfolgten Flughafen (oder dem, den
du wählst):

- eine **Schließung** meldet oder aufhebt (`closed`, `reopened`);
- einen **Ground Stop** verhängt oder aufhebt (`ground_stop_declared`, `ground_stop_lifted`);
- Verspätungen meldet (Abflüge, Ankünfte oder ein Ground Delay Program) oder beendet
  (`delay_declared`, `delay_lifted`).

Wähle im Auslöser die gewünschten Ereignisse. Die Variablen liefern den Flughafen, das Ereignis,
den Status in Worten, die Stufe und die vorherige Stufe, die Ursache, die durchschnittlichen
Abflug- und Ankunftsverspätungen und das voraussichtliche Ende. Beim ersten Lesen nach dem Start
von Gladys oder der Integration löst nichts aus: Was schon da war, ist keine Neuigkeit.

## Szenen-Aktion

**Flughafenstatus abrufen**: liefert für einen verfolgten Flughafen einen Satz („EWR · Newark:
Ground Stop bis 23:45 · Abflüge 121–135 min ↗. Ursache: Gewitter.“), den Status, die Stufe und
ihren Namen, Verspätungen, Ground Stop, Ground Delay Program und Schließung als 1 oder 0, die vier
Verspätungen in Minuten und die Ursache. Nutze sie in einer Nachricht oder in einem Schritt „Nur
fortfahren, wenn“.

## Szenen-Beispiele

- **Vor einem Flug**: jeden Morgen um 6:00 den Status von `JFK` abrufen; nur fortfahren, wenn die
  Stufe größer als 0 ist; den Satz per Telegram senden.
- **Jemanden abholen**: Wenn am Ankunftsflughafen des Abends ein Ground Stop verhängt wird, eine
  Nachricht senden: „Der Flug hat Verspätung: Ground Stop in JFK, Ursache: Gewitter“.
- **Zurück zur Normalität**: Wenn die Verspätungen in `ORD` enden, es über den Küchenlautsprecher
  ansagen.

## Daten, Aktualisierung und Bedingungen

Die Integration liest `https://nasstatus.faa.gov/api/airport-events` alle 5 oder 10 Minuten,
einmal für alle verfolgten Flughäfen und nur, wenn mindestens ein Flughafengerät angelegt ist. Es
ist der Feed der NAS-Status-Seite der FAA selbst; er braucht keinen Schlüssel, und die FAA nennt
dafür kein Kontingent. Flughäfen, die in der Antwort fehlen, laufen normal.

- **Ground Stop**: Die FAA hält die Flüge zum Flughafen an ihrem Abflugort fest, meist wegen
  Gewittern oder schlechter Sicht. Der Status nennt das geplante Ende.
- **Ground Delay Program**: Die FAA dosiert die Flüge zum Flughafen und weist ihnen eine Wartezeit
  vor dem Start zu; ihre durchschnittliche und maximale Verspätung zählen als
  Ankunftsverspätungen.
- **Abflug- und Ankunftsverspätungen**: vom Flughafen gemeldet, als Spanne („16–30 min“) mit
  Tendenz.
- **Schließung**: ein NOTAM, das den Flughafen gerade schließt. Schließungen mit täglichen Zeiten
  („DLY 0430-0945“) zählen nur in diesen Zeiten; Schließungen, die Linienflüge zulassen, und
  Einschränkungen nur für die allgemeine Luftfahrt werden ignoriert.

## Fehlerbehebung

- **Das Gerät zeigt keinen Wert**: Lege es im Tab **Entdecken** an; die Werte kommen in wenigen
  Sekunden.
- **Der Verbindungsstatus sagt „Die FAA antwortet nicht“**: Der Feed ist ausgefallen oder von
  deinem Gladys aus nicht erreichbar. Die letzten Werte bleiben; die Integration versucht es bei
  jedem Intervall erneut und meldet, wenn er wieder da ist.
- **Ein Flughafen ist nie gestört**: Prüfe seinen Code mit **Status**. Ein Flughafen außerhalb der
  77 großen erscheint selten im Feed.
- **Mehr Details**: Setze `LOG_LEVEL=debug` in der Umgebung der Integration; ein normales Lesen
  schreibt nichts auf Info-Ebene.

## Grenzen

- Die FAA deckt die USA ab (und einige kanadische Programs): kein anderes Land.
- Keine Daten pro Flug: Die Verspätungen sind die des Flughafens, nicht deines Flugs.
- Einschränkungen für die allgemeine Luftfahrt, Enteisung und Pistenkonfigurationen werden nicht
  angezeigt.
- Die Funktionsnamen werden beim Anlegen des Geräts festgelegt.
- Bis zu 20 Flughäfen.

## Danksagungen

- Daten: [FAA NAS Status](https://nasstatus.faa.gov), ein öffentlicher Dienst der Federal Aviation
  Administration. Diese Integration ist weder mit der FAA verbunden noch von ihr unterstützt.
- Inspiriert von der Home-Assistant-Integration
  [FAA Delays](https://www.home-assistant.io/integrations/faa_delays/) (Apache 2.0) und ihrer
  Bibliothek `faadelays`.
