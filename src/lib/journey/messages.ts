/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - veranstaltungen: titel (Titel), veranstaltungscode (Veranstaltungscode für den QR-Link)
 *   - teilnehmende: veranstaltung (Veranstaltung), kuerzel (Kürzel)
 *   - fragen_an_die_gruppe: veranstaltung (Veranstaltung), typ (Typ), fragestellung (Fragestellung an die Gruppe), status (Status)
 *   - beitraege: antwort (Antwort), freigabe (Freigabe), frage (Frage)
 *   - auswertungen: frage (Frage)
 *   - beamer_steuerung: veranstaltung (Veranstaltung), anzeige (Auf Beamer zeigen)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "veranstaltungen": "titel" | "datum" | "ort" | "beschreibung" | "veranstaltungscode";
  "teilnehmende": "veranstaltung" | "kuerzel" | "email" | "einwilligung" | "einwilligung_zeitpunkt";
  "fragen_an_die_gruppe": "quell_auswertung" | "veranstaltung" | "typ" | "laufende_nummer" | "bezeichnung" | "fragestellung" | "einleitung_ki" | "auftrag_ki" | "status" | "beitraege_sofort_zeigen";
  "beitraege": "teilnehmer" | "antwort" | "anmerkung" | "wichtigkeit" | "sendekennung" | "freigabe" | "eingangszeit" | "frage";
  "auswertungen": "frage" | "beitraege" | "bezeichnung" | "fassung" | "erstellt_am" | "beitraege_stand" | "zusammenstellung" | "ki_antwort" | "abschnitt_1" | "abschnitt_2" | "abschnitt_3" | "abschnitt_4" | "abschnitt_5" | "abschnitt_6" | "notizen" | "vorschlaege" | "bearbeitungsstatus";
  "beamer_steuerung": "veranstaltung" | "anzeige" | "aktueller_abschnitt" | "frage" | "auswertung";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  veranstaltungen: { titel: "Bitte den Titel der Veranstaltung eingeben.", veranstaltungscode: "Bitte einen Veranstaltungscode für den QR-Link eingeben." },
  teilnehmende: { veranstaltung: "Bitte eine Veranstaltung auswählen.", kuerzel: "Bitte das Kürzel eingeben." },
  fragen_an_die_gruppe: { veranstaltung: "Bitte eine Veranstaltung auswählen.", typ: "Bitte den Typ der Frage wählen.", fragestellung: "Bitte die Frage an die Gruppe eingeben.", status: "Bitte den Status der Frage wählen." },
  beitraege: { antwort: "Bitte deine Antwort eingeben.", freigabe: "Bitte die Freigabe wählen.", frage: "Bitte eine Frage auswählen." },
  auswertungen: { frage: "Bitte eine Frage auswählen." },
  beamer_steuerung: { veranstaltung: "Bitte eine Veranstaltung auswählen.", anzeige: "Bitte wählen, was auf dem Beamer erscheint." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
