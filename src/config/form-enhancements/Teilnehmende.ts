// Auto-generated. Per-entity form-enhancements config for "Teilnehmende".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["veranstaltung", "kuerzel", "email", {"row": ["einwilligung", "einwilligung_zeitpunkt"], "cols": "1fr 1fr"}],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
