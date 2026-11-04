import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Veranstaltungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    beschreibung?: string;
    veranstaltungscode?: string;
  };
}

export interface Teilnehmende {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
    kuerzel?: string;
    email?: string;
    einwilligung?: boolean;
    einwilligung_zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface FragenAnDieGruppe {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    quell_auswertung?: RecordUrl; // applookup -> URL zu 'Auswertungen' Record
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
    typ?: LookupValue;
    laufende_nummer?: number;
    bezeichnung?: string;
    fragestellung?: string;
    einleitung_ki?: string;
    auftrag_ki?: string;
    status?: LookupValue;
    beitraege_sofort_zeigen?: boolean;
  };
}

export interface Beitraege {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    teilnehmer?: RecordUrl; // applookup -> URL zu 'Teilnehmende' Record
    antwort?: string;
    anmerkung?: string;
    wichtigkeit?: LookupValue;
    sendekennung?: string;
    freigabe?: LookupValue;
    eingangszeit?: string; // Format: YYYY-MM-DD oder ISO String
    frage?: RecordUrl; // applookup -> URL zu 'FragenAnDieGruppe' Record
  };
}

export interface Auswertungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    frage?: RecordUrl; // applookup -> URL zu 'FragenAnDieGruppe' Record
    beitraege?: RecordUrl[];
    bezeichnung?: string;
    fassung?: number;
    erstellt_am?: string; // Format: YYYY-MM-DD oder ISO String
    beitraege_stand?: string; // Format: YYYY-MM-DD oder ISO String
    zusammenstellung?: string;
    ki_antwort?: string;
    abschnitt_1?: string;
    abschnitt_2?: string;
    abschnitt_3?: string;
    abschnitt_4?: string;
    abschnitt_5?: string;
    abschnitt_6?: string;
    notizen?: string;
    vorschlaege?: string;
    bearbeitungsstatus?: LookupValue;
  };
}

export interface BeamerSteuerung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
    anzeige?: LookupValue;
    aktueller_abschnitt?: number;
    frage?: RecordUrl; // applookup -> URL zu 'FragenAnDieGruppe' Record
    auswertung?: RecordUrl; // applookup -> URL zu 'Auswertungen' Record
  };
}

export const APP_IDS = {
  VERANSTALTUNGEN: '6aeb80c0ad9d7b9f92749632',
  TEILNEHMENDE: '6aeb80c6c9f96470f25f8378',
  FRAGEN_AN_DIE_GRUPPE: '6aeb80c6b89d4b9f4cbbbe65',
  BEITRAEGE: '6aeb80c70a353f3beec62897',
  AUSWERTUNGEN: '6aeb80c88b3ef0846f80b08b',
  BEAMER_STEUERUNG: '6aeb80c92505db2c7e7d5c33',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'fragen_an_die_gruppe': {
    typ: [{ key: "ideen", get label() { return lookupLabel('fragen_an_die_gruppe', 'typ', "ideen") ?? "Ideen"; } }, { key: "fragen", get label() { return lookupLabel('fragen_an_die_gruppe', 'typ', "fragen") ?? "Fragen"; } }, { key: "stimmung", get label() { return lookupLabel('fragen_an_die_gruppe', 'typ', "stimmung") ?? "Stimmung"; } }, { key: "probleme", get label() { return lookupLabel('fragen_an_die_gruppe', 'typ', "probleme") ?? "Probleme"; } }, { key: "massnahmen", get label() { return lookupLabel('fragen_an_die_gruppe', 'typ', "massnahmen") ?? "Maßnahmen"; } }],
    status: [{ key: "vorbereitet", get label() { return lookupLabel('fragen_an_die_gruppe', 'status', "vorbereitet") ?? "Vorbereitet"; } }, { key: "geoeffnet", get label() { return lookupLabel('fragen_an_die_gruppe', 'status', "geoeffnet") ?? "Geöffnet"; } }, { key: "geschlossen", get label() { return lookupLabel('fragen_an_die_gruppe', 'status', "geschlossen") ?? "Geschlossen"; } }],
  },
  'beitraege': {
    wichtigkeit: [{ key: "niedrig", get label() { return lookupLabel('beitraege', 'wichtigkeit', "niedrig") ?? "Niedrig"; } }, { key: "mittel", get label() { return lookupLabel('beitraege', 'wichtigkeit', "mittel") ?? "Mittel"; } }, { key: "hoch", get label() { return lookupLabel('beitraege', 'wichtigkeit', "hoch") ?? "Hoch"; } }],
    freigabe: [{ key: "neu", get label() { return lookupLabel('beitraege', 'freigabe', "neu") ?? "Neu"; } }, { key: "freigegeben", get label() { return lookupLabel('beitraege', 'freigabe', "freigegeben") ?? "Für Beamer freigegeben"; } }, { key: "ausgeblendet", get label() { return lookupLabel('beitraege', 'freigabe', "ausgeblendet") ?? "Ausgeblendet"; } }],
  },
  'auswertungen': {
    bearbeitungsstatus: [{ key: "zusammengestellt", get label() { return lookupLabel('auswertungen', 'bearbeitungsstatus', "zusammengestellt") ?? "Zusammengestellt"; } }, { key: "an_ki_gegeben", get label() { return lookupLabel('auswertungen', 'bearbeitungsstatus', "an_ki_gegeben") ?? "An KI gegeben"; } }, { key: "ergebnis_vorhanden", get label() { return lookupLabel('auswertungen', 'bearbeitungsstatus', "ergebnis_vorhanden") ?? "Ergebnis vorhanden"; } }],
  },
  'beamer_steuerung': {
    anzeige: [{ key: "frage_beitraege", get label() { return lookupLabel('beamer_steuerung', 'anzeige', "frage_beitraege") ?? "Frage mit QR-Code und freigegebenen Beiträgen"; } }, { key: "zusammenstellung", get label() { return lookupLabel('beamer_steuerung', 'anzeige', "zusammenstellung") ?? "Zusammenstellung"; } }, { key: "ki_ergebnis", get label() { return lookupLabel('beamer_steuerung', 'anzeige', "ki_ergebnis") ?? "KI-Ergebnis Abschnitt für Abschnitt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'veranstaltungen': {
    'titel': 'string/text',
    'datum': 'date/datetimeminute',
    'ort': 'string/text',
    'beschreibung': 'string/textarea',
    'veranstaltungscode': 'string/text',
  },
  'teilnehmende': {
    'veranstaltung': 'applookup/select',
    'kuerzel': 'string/text',
    'email': 'string/email',
    'einwilligung': 'bool',
    'einwilligung_zeitpunkt': 'date/datetimeminute',
  },
  'fragen_an_die_gruppe': {
    'quell_auswertung': 'applookup/select',
    'veranstaltung': 'applookup/select',
    'typ': 'lookup/select',
    'laufende_nummer': 'number',
    'bezeichnung': 'string/text',
    'fragestellung': 'string/textarea',
    'einleitung_ki': 'string/textarea',
    'auftrag_ki': 'string/textarea',
    'status': 'lookup/radio',
    'beitraege_sofort_zeigen': 'bool',
  },
  'beitraege': {
    'teilnehmer': 'applookup/select',
    'antwort': 'string/textarea',
    'anmerkung': 'string/textarea',
    'wichtigkeit': 'lookup/radio',
    'sendekennung': 'string/text',
    'freigabe': 'lookup/radio',
    'eingangszeit': 'date/datetimeminute',
    'frage': 'applookup/select',
  },
  'auswertungen': {
    'frage': 'applookup/select',
    'beitraege': 'multipleapplookup/select',
    'bezeichnung': 'string/text',
    'fassung': 'number',
    'erstellt_am': 'date/datetimeminute',
    'beitraege_stand': 'date/datetimeminute',
    'zusammenstellung': 'string/textarea',
    'ki_antwort': 'string/textarea',
    'abschnitt_1': 'string/textarea',
    'abschnitt_2': 'string/textarea',
    'abschnitt_3': 'string/textarea',
    'abschnitt_4': 'string/textarea',
    'abschnitt_5': 'string/textarea',
    'abschnitt_6': 'string/textarea',
    'notizen': 'string/textarea',
    'vorschlaege': 'string/textarea',
    'bearbeitungsstatus': 'lookup/select',
  },
  'beamer_steuerung': {
    'veranstaltung': 'applookup/select',
    'anzeige': 'lookup/radio',
    'aktueller_abschnitt': 'number',
    'frage': 'applookup/select',
    'auswertung': 'applookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'veranstaltungen': [
    { field: 'veranstaltung', entity: 'teilnehmende' },
    { field: 'veranstaltung', entity: 'fragen_an_die_gruppe' },
    { field: 'veranstaltung', entity: 'beamer_steuerung' },
  ],
  'fragen_an_die_gruppe': [
    { field: 'frage', entity: 'beitraege' },
    { field: 'frage', entity: 'auswertungen' },
    { field: 'frage', entity: 'beamer_steuerung' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateTeilnehmende = StripLookup<Teilnehmende['fields']>;
export type CreateFragenAnDieGruppe = StripLookup<FragenAnDieGruppe['fields']>;
export type CreateBeitraege = StripLookup<Beitraege['fields']>;
export type CreateAuswertungen = StripLookup<Auswertungen['fields']>;
export type CreateBeamerSteuerung = StripLookup<BeamerSteuerung['fields']>;