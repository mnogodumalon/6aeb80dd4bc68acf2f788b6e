// Auto-generated. Per-entity form-enhancements config for "Auswertungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["frage", "bezeichnung", {"row": ["fassung", "bearbeitungsstatus"], "cols": "1fr 2fr"}, {"row": ["erstellt_am", "beitraege_stand"], "cols": "1fr 1fr"}, "beitraege", "zusammenstellung", "ki_antwort", "abschnitt_1", "abschnitt_2", "abschnitt_3", "abschnitt_4", "abschnitt_5", "abschnitt_6", "vorschlaege", "notizen"],
  defaults: {
    'erstellt_am': { kind: 'today', withTime: true },
    'beitraege_stand': { kind: 'today', withTime: true },
    'bearbeitungsstatus': { kind: 'lookup', key: 'zusammengestellt', label: 'Zusammengestellt' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
