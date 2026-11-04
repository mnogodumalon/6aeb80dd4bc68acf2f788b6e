/**
 * Auswertung erstellen — 4-Schritt-Wizard für eine neue Auswertungs-Fassung.
 * Steps: 1) Frage wählen → 2) Text zusammenstellen, bearbeiten, kopieren → 3) KI-Ergebnis in Abschnitte eintragen (überspringbar) → 4) Prüfen & anlegen.
 * Reads: fragen_an_die_gruppe, beitraege (nicht ausgeblendet), auswertungen (Zähler für die Fassung).
 * Writes: auswertungen (immer ein neuer Datensatz, alte Fassungen bleiben).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useEffect, useMemo, useState } from 'react';
import { IconCheck, IconCopy, IconRefresh, IconSparkles } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  useStepForm, useJourneySubmit, useRecordSearch, useRecordCount,
  fieldText, fieldLookup, fieldRef, fieldDate, refFilter, combineFilters, nowIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const SECTION_KEYS = ['abschnitt_1', 'abschnitt_2', 'abschnitt_3', 'abschnitt_4', 'abschnitt_5', 'abschnitt_6'];

/** Splits a pasted AI answer into at most 6 sections: by headings if present, else by paragraphs. */
function splitSections(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];
  let parts: string[] = [];
  if (/^#{1,3}\s/m.test(clean)) {
    parts = clean.split(/\n(?=#{1,3}\s)/).map(p => p.trim()).filter(Boolean);
  } else {
    parts = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  }
  if (parts.length <= 6) return parts;
  const size = Math.ceil(parts.length / 6);
  const grouped: string[] = [];
  for (let i = 0; i < parts.length; i += size) grouped.push(parts.slice(i, i + size).join('\n\n'));
  return grouped;
}

export default function AuswertungErstellenPage() {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const fragen = useRecordSearch(servicePort, 'fragen_an_die_gruppe', {
    searchFields: ['bezeichnung', 'fragestellung'],
    toItem: q => ({
      id: q.id,
      title: fieldText(q, 'bezeichnung') || fieldText(q, 'fragestellung').slice(0, 60),
      subtitle: fieldText(q, 'fragestellung').slice(0, 120),
      status: fieldLookup(q, 'status') ?? undefined,
    }),
  });

  const f = useStepForm('auswertungen', {
    steps: {
      frage: 1,
      zusammenstellung: 2,
      ki_antwort: 3,
      abschnitt_1: 3, abschnitt_2: 3, abschnitt_3: 3, abschnitt_4: 3, abschnitt_5: 3, abschnitt_6: 3,
      vorschlaege: 3, notizen: 3, bearbeitungsstatus: 3,
    },
  });
  const frageId = (f.get('frage') as string | undefined) || undefined;

  const beitraege = useRecordSearch(servicePort, 'beitraege', {
    searchFields: ['antwort'],
    filter: frageId ? combineFilters(refFilter('frage', frageId), "r.v_freigabe in ['neu', 'freigegeben']") : undefined,
    where: r => Boolean(frageId) && fieldRef(r, 'frage') === frageId && fieldLookup(r, 'freigabe')?.key !== 'ausgeblendet',
    orderby: ['r.v_eingangszeit asc'],
    loadAllUpTo: 2000,
  });
  const bestehend = useRecordCount(servicePort, 'auswertungen', {
    filter: frageId ? refFilter('frage', frageId) : undefined,
    where: r => fieldRef(r, 'frage') === frageId,
    enabled: Boolean(frageId),
  });

  const verwendet = useMemo(
    () => (frageId ? [...beitraege.records].sort((a, b) => (fieldDate(a, 'eingangszeit') ?? '').localeCompare(fieldDate(b, 'eingangszeit') ?? '')) : []),
    [beitraege.records, frageId],
  );
  const frageRecord = frageId ? fragen.recordOf(frageId) : undefined;
  const wichtigkeitLabel = tx('Wichtigkeit');

  const compiled = useMemo(() => {
    if (!frageRecord) return '';
    const zeilen = verwendet.map((b, i) => {
      const antwort = fieldText(b, 'antwort').replace(/\s*\n\s*/g, ' ').trim();
      const w = fieldLookup(b, 'wichtigkeit');
      return `${i + 1}. ${antwort}${w ? ` (${wichtigkeitLabel}: ${w.label})` : ''}`;
    });
    return [
      fieldText(frageRecord, 'einleitung_ki').trim(),
      fieldText(frageRecord, 'fragestellung').trim(),
      zeilen.join('\n'),
      fieldText(frageRecord, 'auftrag_ki').trim(),
    ].filter(Boolean).join('\n\n');
  }, [frageRecord, verwendet, wichtigkeitLabel]);

  const stand = useMemo(() => {
    const zeiten = verwendet.map(b => (fieldDate(b, 'eingangszeit') ?? '').slice(0, 16)).filter(Boolean).sort();
    return zeiten.length ? zeiten[zeiten.length - 1] : '';
  }, [verwendet]);

  // derived start values — prefill never overwrites what the moderator typed
  useEffect(() => {
    if (compiled) f.prefill('zusammenstellung', compiled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled]);

  const hatErgebnis = SECTION_KEYS.some(k => String(f.get(k) ?? '').trim() !== '');
  useEffect(() => {
    f.prefill('bearbeitungsstatus', hatErgebnis ? 'ergebnis_vorhanden' : 'zusammengestellt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hatErgebnis]);

  const fassung = (bestehend.count ?? 0) + 1;
  const frageName = frageId ? (fragen.labelOf(frageId) ?? '') : '';
  const bezeichnung = `${frageName} – Fassung ${fassung}`; // i18n-exempt

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'auswertung', entity: 'auswertungen', form: f, primary: true,
      values: () => ({
        fassung,
        bezeichnung,
        erstellt_am: nowIso(),
        beitraege: verwendet.map(b => b.id),
        beitraege_stand: stand || nowIso(),
      }),
    },
  ], { draftKey: 'auswertung-erstellen' });

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(String(f.get('zusammenstellung') ?? ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const suggestSplit = () => {
    const parts = splitSections(String(f.get('ki_antwort') ?? ''));
    SECTION_KEYS.forEach((k, i) => f.set(k, parts[i] ?? ''));
  };

  return (
    <IntentWizardShell
      title={tx('Auswertung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="auswertung-erstellen"
      intro={{
        description: tx('Aus den Beiträgen einer Frage eine neue Auswertungs-Fassung bauen.'),
        needs: [tx('Die Frage, die ausgewertet wird'), tx('Optional: die Antwort der KI')],
      }}
    >
      <WizardStep label={tx('Frage')} description={tx('Welche Frage soll ausgewertet werden? Auch geschlossene Fragen sind möglich.')}>
        <EntitySelectStep
          {...fragen.select}
          selectedId={frageId}
          searchPlaceholder={tx('Bezeichnung oder Fragestellung …')}
          onSelect={id => { f.set('frage', id, fragen.labelOf(id)); setStep(2); }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Zusammenstellung')}
        description={tx('Prüfe den Text, passe ihn an und gib ihn an die KI — oder kopiere ihn.')}
        needs={['frage']}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {beitraege.select.loading
              ? tx('Beiträge werden geladen …')
              : tx`${verwendet.length} Beiträge sind enthalten (ausgeblendete sind weggelassen).`}
          </p>
          <Bound form={f} name="zusammenstellung" rows={14} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copyText}>
              {copied ? <IconCheck size={16} className="shrink-0" /> : <IconCopy size={16} className="shrink-0" />}
              <span className="ml-2">{copied ? tx('Kopiert') : tx('Text kopieren')}</span>
            </Button>
            <Button type="button" variant="outline" onClick={() => f.set('zusammenstellung', compiled)}>
              <IconRefresh size={16} className="shrink-0" />
              <span className="ml-2">{tx('Neu zusammenstellen')}</span>
            </Button>
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['zusammenstellung'])}
            nextStepLabel={tx('Ergebnis')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Ergebnis')}
        description={tx('Füge die Antwort der KI ein und verteile sie auf Abschnitte — oder überspringe den Schritt.')}
        needs={['frage']}
      >
        <div className="space-y-4">
          <Bound form={f} name="ki_antwort" rows={8} />
          <Button type="button" variant="outline" onClick={suggestSplit} disabled={!String(f.get('ki_antwort') ?? '').trim()}>
            <IconSparkles size={16} className="shrink-0" />
            <span className="ml-2">{tx('In 4–6 Abschnitte aufteilen')}</span>
          </Button>
          {SECTION_KEYS.map(k => <Bound key={k} form={f} name={k} rows={4} />)}
          <Bound form={f} name="vorschlaege" rows={3} />
          <Bound form={f} name="notizen" rows={3} />
          <Bound form={f} name="bearbeitungsstatus" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => {
              if (bestehend.count === null && bestehend.loading) return tx('Die Fassungsnummer wird noch ermittelt — gleich nochmal versuchen.');
              return f.validate(['ki_antwort', ...SECTION_KEYS, 'vorschlaege', 'notizen', 'bearbeitungsstatus']);
            }}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              { key: 'bezeichnung', label: tx('Bezeichnung'), value: bezeichnung },
              { key: 'fassung', label: tx('Fassung'), value: String(fassung) },
              { key: 'beitraege', label: tx('Enthaltene Beiträge'), value: String(verwendet.length) },
            ]}
            whatHappensNext={tx('Es entsteht immer eine neue Fassung — frühere Fassungen bleiben unverändert erhalten.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          submit={submit}
          forms={[f]}
          next={[
            { label: tx('Frage daraus anlegen'), href: `#/intents/frage-anlegen?auswertung=${submit.result.primary.id}` },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Aus den Vorschlägen kannst du direkt eine neue Frage an die Gruppe machen.')}
        />
      )}
    </IntentWizardShell>
  );
}
