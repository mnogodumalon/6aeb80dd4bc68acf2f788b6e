// Auto-generated. Per-entity form-enhancements config for "Beamer-Steuerung".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["veranstaltung", "anzeige", {"row": ["frage", "auswertung"], "cols": "1fr 1fr"}, "aktueller_abschnitt"],
  defaults: {
    'anzeige': { kind: 'lookup', key: 'frage_beitraege', label: 'Frage mit QR-Code und freigegebenen Beiträgen' },
    'aktueller_abschnitt': { kind: 'literal', value: 1 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
