import type { EnrichedAuswertungen, EnrichedBeamerSteuerung, EnrichedBeitraege, EnrichedFragenAnDieGruppe, EnrichedTeilnehmende } from '@/types/enriched';
import type { Auswertungen, BeamerSteuerung, Beitraege, FragenAnDieGruppe, Teilnehmende, Veranstaltungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface TeilnehmendeMaps {
  veranstaltungenMap: Map<string, Veranstaltungen>;
}

export function enrichTeilnehmende(
  teilnehmende: Teilnehmende[],
  maps: TeilnehmendeMaps
): EnrichedTeilnehmende[] {
  return teilnehmende.map(r => ({
    ...r,
    veranstaltungName: resolveDisplay(r.fields.veranstaltung, maps.veranstaltungenMap, 'titel'),
  }));
}

interface FragenAnDieGruppeMaps {
  auswertungenMap: Map<string, Auswertungen>;
  veranstaltungenMap: Map<string, Veranstaltungen>;
}

export function enrichFragenAnDieGruppe(
  fragenAnDieGruppe: FragenAnDieGruppe[],
  maps: FragenAnDieGruppeMaps
): EnrichedFragenAnDieGruppe[] {
  return fragenAnDieGruppe.map(r => ({
    ...r,
    quell_auswertungName: resolveDisplay(r.fields.quell_auswertung, maps.auswertungenMap, 'bezeichnung'),
    veranstaltungName: resolveDisplay(r.fields.veranstaltung, maps.veranstaltungenMap, 'titel'),
  }));
}

interface BeitraegeMaps {
  teilnehmendeMap: Map<string, Teilnehmende>;
  fragenAnDieGruppeMap: Map<string, FragenAnDieGruppe>;
}

export function enrichBeitraege(
  beitraege: Beitraege[],
  maps: BeitraegeMaps
): EnrichedBeitraege[] {
  return beitraege.map(r => ({
    ...r,
    teilnehmerName: resolveDisplay(r.fields.teilnehmer, maps.teilnehmendeMap, 'kuerzel'),
    frageName: resolveDisplay(r.fields.frage, maps.fragenAnDieGruppeMap, 'bezeichnung'),
  }));
}

interface AuswertungenMaps {
  fragenAnDieGruppeMap: Map<string, FragenAnDieGruppe>;
  beitraegeMap: Map<string, Beitraege>;
}

export function enrichAuswertungen(
  auswertungen: Auswertungen[],
  maps: AuswertungenMaps
): EnrichedAuswertungen[] {
  return auswertungen.map(r => ({
    ...r,
    frageName: resolveDisplay(r.fields.frage, maps.fragenAnDieGruppeMap, 'bezeichnung'),
    beitraegeName: resolveDisplay(r.fields.beitraege, maps.beitraegeMap, 'antwort'),
  }));
}

interface BeamerSteuerungMaps {
  veranstaltungenMap: Map<string, Veranstaltungen>;
  fragenAnDieGruppeMap: Map<string, FragenAnDieGruppe>;
  auswertungenMap: Map<string, Auswertungen>;
}

export function enrichBeamerSteuerung(
  beamerSteuerung: BeamerSteuerung[],
  maps: BeamerSteuerungMaps
): EnrichedBeamerSteuerung[] {
  return beamerSteuerung.map(r => ({
    ...r,
    veranstaltungName: resolveDisplay(r.fields.veranstaltung, maps.veranstaltungenMap, 'titel'),
    frageName: resolveDisplay(r.fields.frage, maps.fragenAnDieGruppeMap, 'bezeichnung'),
    auswertungName: resolveDisplay(r.fields.auswertung, maps.auswertungenMap, 'bezeichnung'),
  }));
}
