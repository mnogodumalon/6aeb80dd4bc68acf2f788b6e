/**
 * Frage anlegen — 4-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Typ & Fragestellung → 3) Herkunft (optional, Auswertung) → 4) Prüfen & anlegen.
 * Opened with `?auswertung=<id>` the Auswertung is preselected (and its Veranstaltung), its Vorschläge are offered as copy source.
 * Reads: veranstaltungen, auswertungen, fragen_an_die_gruppe (count). Writes: fragen_an_die_gruppe (status vorbereitet,
 * laufende_nummer = existing questions of event+typ + 1, bezeichnung = Typ + Nummer).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, SuggestionPicker, StepNav, SummaryStep, SuccessStep.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { SuggestionPicker } from '@/components/blocks/SuggestionPicker';
import { Button } from '@/components/ui/button';
import {
  useStepForm, useJourneySubmit, useRecordSearch, useRecordCount,
  fieldText, fieldDate, fieldRef, fieldLookup, refFilter, combineFilters,
  optionsOf, suggestionLines, type JourneyRecord,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const DRAFT_KEY = 'frage-anlegen';

export default function FrageAnlegenPage() {
  const [step, setStep] = useState(1);
  const [params] = useSearchParams();
  const presetId = params.get('auswertung');
  const [preRecord, setPreRecord] = useState<JourneyRecord | null>(null);
  const [eventQuestionIds, setEventQuestionIds] = useState<Set<string> | null>(null);

  const f = useStepForm('fragen_an_die_gruppe', {
    fields: ['veranstaltung', 'typ', 'fragestellung', 'einleitung_ki', 'auftrag_ki', 'beitraege_sofort_zeigen', 'quell_auswertung'],
    steps: { veranstaltung: 1, typ: 2, fragestellung: 2, einleitung_ki: 2, auftrag_ki: 2, beitraege_sofort_zeigen: 2, quell_auswertung: 3 },
    required: { quell_auswertung: false },
    initial: { beitraege_sofort_zeigen: false },
  });

  const veranstaltungId = (f.get('veranstaltung') as string | null) || null;
  const typKey = (f.get('typ') as string | null) || null;

  const veranstaltungen = useRecordSearch(servicePort, 'veranstaltungen', {
    searchFields: ['titel', 'ort'],
    toItem: v => ({ id: v.id, title: fieldText(v, 'titel'), subtitle: [fieldDate(v, 'datum'), fieldText(v, 'ort')].filter(Boolean).join(' · ') }),
  });

  // Only Auswertungen of the chosen event's questions (all when the event's questions are unknown).
  const auswertungen = useRecordSearch(servicePort, 'auswertungen', {
    searchFields: ['bezeichnung'],
    where: r => {
      if (!veranstaltungId || !eventQuestionIds) return true;
      const q = fieldRef(r, 'frage');
      return q !== null && eventQuestionIds.has(q);
    },
    toItem: a => ({ id: a.id, title: fieldText(a, 'bezeichnung') || tx('Auswertung'), subtitle: fieldLookup(a, 'bearbeitungsstatus')?.label }),
  });

  const count = useRecordCount(servicePort, 'fragen_an_die_gruppe', {
    filter: veranstaltungId && typKey ? combineFilters(refFilter('veranstaltung', veranstaltungId), `r.v_typ == '${typKey}'`) : undefined,
    where: r => fieldRef(r, 'veranstaltung') === veranstaltungId && fieldLookup(r, 'typ')?.key === typKey,
    enabled: Boolean(veranstaltungId && typKey),
  });

  const nummer = count.count !== null ? count.count + 1 : null;
  const typLabel = optionsOf('fragen_an_die_gruppe', 'typ').find(o => o.key === typKey)?.label ?? '';
  const bezeichnung = nummer !== null && typLabel ? `${typLabel} ${nummer}` : '';

  // Question ids of the chosen event — narrows the Auswertung pick.
  useEffect(() => {
    if (!veranstaltungId) { setEventQuestionIds(null); return; }
    let alive = true;
    servicePort.list('fragen_an_die_gruppe', { filter: refFilter('veranstaltung', veranstaltungId), fields: ['veranstaltung'] })
      .then(rows => { if (alive) setEventQuestionIds(new Set(rows.map(r => r.id))); })
      .catch(() => { if (alive) setEventQuestionIds(null); });
    return () => { alive = false; };
  }, [veranstaltungId]);

  // Opened with an Auswertung: start with it (and its Veranstaltung) set.
  const presetDone = useRef(false);
  useEffect(() => {
    if (!presetId || presetDone.current) return;
    presetDone.current = true;
    (async () => {
      const a = await servicePort.get('auswertungen', presetId);
      if (!a) return;
      setPreRecord(a);
      if (!f.get('quell_auswertung')) f.set('quell_auswertung', a.id, fieldText(a, 'bezeichnung') || tx('Auswertung'));
      const qId = fieldRef(a, 'frage');
      const q = qId ? await servicePort.get('fragen_an_die_gruppe', qId) : null;
      const vId = q ? fieldRef(q, 'veranstaltung') : null;
      if (vId && !f.get('veranstaltung')) {
        const v = await servicePort.get('veranstaltungen', vId);
        f.set('veranstaltung', vId, v ? fieldText(v, 'titel') : tx('Veranstaltung'));
      }
    })().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  const quellId = (f.get('quell_auswertung') as string | null) || null;
  const quellRecord = quellId ? (auswertungen.recordOf(quellId) ?? (preRecord?.id === quellId ? preRecord : undefined)) : undefined;
  const suggestions = useMemo(() => suggestionLines(quellRecord ? fieldText(quellRecord, 'vorschlaege') : ''), [quellRecord]);

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'frage', entity: 'fragen_an_die_gruppe', form: f, primary: true,
      values: { status: 'vorbereitet', laufende_nummer: nummer ?? 1, bezeichnung },
    },
  ], { draftKey: DRAFT_KEY });

  return (
    <IntentWizardShell
      title={tx('Frage anlegen')}
      currentStep={step} onStepChange={setStep}
      forms={[f]} draftKey={DRAFT_KEY}
      intro={{ description: tx('Eine neue Frage für eine Veranstaltung vorbereiten.'), needs: [tx('Veranstaltung'), tx('Text der Fragestellung')] }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Zu welcher Veranstaltung gehört die Frage?')}>
        <EntitySelectStep {...veranstaltungen.select}
          selectedId={veranstaltungId}
          searchPlaceholder={tx('Titel oder Ort …')}
          onSelect={id => { f.set('veranstaltung', id, veranstaltungen.labelOf(id) ?? ''); setStep(2); }} />
      </WizardStep>

      <WizardStep label={tx('Typ & Frage')} description={tx('Welche Art von Frage stellst du der Gruppe?')} needs={['veranstaltung']}>
        <div className="space-y-4">
          <Bound form={f} name="typ" />
          <Bound form={f} name="fragestellung" rows={3} />
          <Bound form={f} name="einleitung_ki" rows={3} />
          <Bound form={f} name="auftrag_ki" rows={3} />
          <Bound form={f} name="beitraege_sofort_zeigen" as="checkbox" />
          <StepNav onBack={() => setStep(1)} onNext={() => f.validate(['typ', 'fragestellung'])} nextStepLabel={tx('Herkunft')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Herkunft')} description={tx('Optional: Entstand die Frage aus einer Auswertung?')} needs={['typ', 'fragestellung']}>
        <div className="space-y-4">
          <Field form={f} name="quell_auswertung">
            <EntitySelectStep {...auswertungen.select}
              selectedId={quellId}
              searchPlaceholder={tx('Bezeichnung der Auswertung …')}
              emptyText={tx('Für diese Veranstaltung gibt es noch keine Auswertung — du kannst diesen Schritt überspringen.')}
              onSelect={id => f.set('quell_auswertung', id, auswertungen.labelOf(id) ?? '')} />
          </Field>
          {quellId && (
            <div className="space-y-3">
              <Button type="button" variant="outline" size="sm" onClick={() => f.record('quell_auswertung').onChange(null)}>
                {tx('Auswahl entfernen')}
              </Button>
              <SuggestionPicker
                suggestions={suggestions}
                value={f.get('fragestellung')}
                label={tx('Vorschläge aus der Auswertung als Fragestellung übernehmen')}
                emptyText={tx('Diese Auswertung enthält keine Vorschläge.')}
                onPick={s => f.set('fragestellung', s)} />
            </div>
          )}
          <StepNav onBack={() => setStep(2)}
            onNext={() => (count.count === null ? tx('Die laufende Nummer wird noch ermittelt — einen Moment bitte.') : true)}
            nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep forms={[f]} submit={submit}
            items={[
              { key: 'bezeichnung', label: tx('Bezeichnung'), value: bezeichnung || '—' },
              { key: 'status', label: tx('Status'), value: tx('Vorbereitet') },
            ]}
            whatHappensNext={tx('Die Frage wird vorbereitet angelegt und kann danach geöffnet werden.')} />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep result={submit.result} submit={submit} forms={[f]}
          title={tx`${fieldText(submit.result.primary, 'bezeichnung') || bezeichnung} angelegt`}
          next={[
            { label: tx('Auswertung erstellen'), href: '#/intents/auswertung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Die Frage hat den Status „Vorbereitet“.')} />
      )}
    </IntentWizardShell>
  );
}
