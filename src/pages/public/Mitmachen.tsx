import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconCheck, IconClockHour4, IconMailHeart } from '@tabler/icons-react';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import {
  loadPublicPagesConfig, listPublicRecords, createPublicRecord, prepareChallenge, recordRef,
  type PublicPagesConfig, type PublicPageConfig, type PublicRecordResult,
} from '@/lib/publicClient';
import { nowIso, useStepForm } from '@/lib/journey';
import { tx } from '@/i18n';

const SLUG = 'mitmachen';
const POLL_MS = 10_000;
// no 0/O, 1/I/L, 5/S, 8/B, 2/Z
const KUERZEL_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';
const KUERZEL_LENGTH = 5;

interface EventInfo { id: string; titel: string; code: string; datum: string | null; ort: string | null }
interface OpenQuestion { id: string; bezeichnung: string; fragestellung: string }
interface Participant { id: string; kuerzel: string; kontaktGesendet?: boolean }

function randomIndex(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function makeKuerzel(): string {
  let out = '';
  for (let i = 0; i < KUERZEL_LENGTH; i++) out += KUERZEL_ALPHABET[randomIndex(KUERZEL_ALPHABET.length)];
  return out;
}

function makeSendekennung(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function idFromRef(ref: unknown): string | null {
  if (typeof ref !== 'string' || !ref) return null;
  const parts = ref.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function readParticipant(eventId: string): Participant | null {
  try {
    const raw = localStorage.getItem(`${SLUG}:tn:${eventId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as Participant;
    return p && p.id && p.kuerzel ? p : null;
  } catch {
    return null;
  }
}

function writeParticipant(eventId: string, p: Participant): void {
  try {
    localStorage.setItem(`${SLUG}:tn:${eventId}`, JSON.stringify(p));
  } catch {
    /* storage unavailable — the kuerzel is then only kept for this visit */
  }
}

function toQuestion(r: PublicRecordResult): OpenQuestion {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id,
    bezeichnung: typeof f.bezeichnung === 'string' ? f.bezeichnung : '',
    fragestellung: typeof f.fragestellung === 'string' ? f.fragestellung : '',
  };
}

export default function Mitmachen() {
  const [params] = useSearchParams();
  const eventParam = (params.get('veranstaltung') ?? '').trim();

  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [eventLoaded, setEventLoaded] = useState(false);
  const [question, setQuestion] = useState<OpenQuestion | null>(null);
  const [questionLoaded, setQuestionLoaded] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);

  const form = useStepForm('beitraege', {
    fields: ['frage', 'teilnehmer', 'antwort', 'anmerkung', 'wichtigkeit', 'sendekennung', 'eingangszeit'],
    autoComplete: true,
  });
  const antwort = String(form.get('antwort') ?? '');
  const anmerkung = String(form.get('anmerkung') ?? '');
  const wichtigkeit = (form.get('wichtigkeit') as string | undefined) ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendekennung = useRef<string | null>(null);

  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [mailBusy, setMailBusy] = useState(false);
  const [mailDone, setMailDone] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const epId = useCallback(
    (op: 'list' | 'create', entity: string) => page?.endpoints?.find(e => e.op === op && e.entity === entity)?.app_id,
    [page],
  );

  // resolve the event from the link parameter (record id or veranstaltungscode)
  useEffect(() => {
    if (!cfg || !page) return;
    const appId = epId('list', 'veranstaltungen');
    if (!appId || !eventParam) { setEventLoaded(true); return; }
    let alive = true;
    listPublicRecords(cfg, page, { appId, limit: 500 }).then(res => {
      if (!alive) return;
      const wanted = eventParam.toLowerCase();
      const hit = Object.values(res).find(r => {
        const code = String((r.fields as Record<string, unknown>).veranstaltungscode ?? '').toLowerCase();
        return r.id.toLowerCase() === wanted || (code !== '' && code === wanted);
      });
      if (hit) {
        const f = hit.fields as Record<string, unknown>;
        setEvent({
          id: hit.id,
          titel: String(f.titel ?? ''),
          code: String(f.veranstaltungscode ?? ''),
          datum: typeof f.datum === 'string' ? f.datum : null,
          ort: typeof f.ort === 'string' ? f.ort : null,
        });
        setParticipant(readParticipant(hit.id));
      }
      setEventLoaded(true);
    }).catch(() => { if (alive) setEventLoaded(true); });
    return () => { alive = false; };
  }, [cfg, page, eventParam, epId]);

  // the currently open question of this event — polled, no reload needed
  useEffect(() => {
    if (!cfg || !page || !event) return;
    const appId = epId('list', 'fragen_an_die_gruppe');
    if (!appId) return;
    let alive = true;
    const load = () => {
      if (document.hidden) return;
      listPublicRecords(cfg, page, { appId, limit: 500 }).then(res => {
        if (!alive) return;
        const mine = Object.values(res).filter(r => idFromRef((r.fields as Record<string, unknown>).veranstaltung) === event.id);
        setQuestion(mine.length > 0 ? toQuestion(mine[0]) : null);
        setQuestionLoaded(true);
      }).catch(() => { if (alive) setQuestionLoaded(true); });
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [cfg, page, event, epId]);

  // a new question starts with a clean form
  const questionId = question?.id ?? null;
  const questionLabel = question?.bezeichnung ?? '';
  const setFrage = form.set;
  useEffect(() => {
    setSent(false);
    setError(null);
    if (questionId) setFrage('frage', questionId, questionLabel);
  }, [questionId, questionLabel, setFrage]);

  const warmUp = useCallback(() => {
    if (!cfg || !page) return;
    const appId = epId('create', 'beitraege');
    if (appId) prepareChallenge(cfg, page, 'POST', `/apps/${appId}/records`);
  }, [cfg, page, epId]);

  const ensureParticipant = useCallback(async (): Promise<Participant> => {
    if (!cfg || !page || !event) throw new Error(tx('not ready'));
    const existing = participant ?? readParticipant(event.id);
    if (existing) return existing;
    const tnApp = epId('create', 'teilnehmende');
    const evApp = epId('list', 'veranstaltungen');
    if (!tnApp || !evApp) throw new Error(tx('missing endpoint'));
    const kuerzel = makeKuerzel();
    const created = await createPublicRecord(cfg, page, {
      veranstaltung: recordRef(cfg, page, evApp, event.id),
      kuerzel,
    });
    const p: Participant = { id: created.id, kuerzel };
    writeParticipant(event.id, p);
    setParticipant(p);
    return p;
  }, [cfg, page, event, participant, epId]);

  const submit = useCallback(async () => {
    if (!cfg || !page || !event || !question) return;
    if (antwort.trim() === '') { setError(tx('Bitte schreib zuerst deinen Beitrag.')); return; }
    const beitraegeApp = epId('create', 'beitraege');
    const fragenApp = epId('list', 'fragen_an_die_gruppe');
    if (!beitraegeApp || !fragenApp) { setError(tx('Senden ist gerade nicht möglich.')); return; }
    setSubmitting(true);
    setError(null);
    try {
      const tn = await ensureParticipant();
      if (!sendekennung.current) sendekennung.current = makeSendekennung();
      const fields: Record<string, unknown> = {
        frage: recordRef(cfg, page, fragenApp, question.id),
        teilnehmer: recordRef(cfg, page, epId('create', 'teilnehmende') ?? '', tn.id),
        antwort: antwort.trim(),
        sendekennung: sendekennung.current,
        eingangszeit: nowIso(),
      };
      if (anmerkung.trim() !== '') fields.anmerkung = anmerkung.trim();
      if (wichtigkeit) fields.wichtigkeit = wichtigkeit;
      await createPublicRecord(cfg, page, fields);
      sendekennung.current = null;
      form.set('antwort', '');
      form.set('anmerkung', '');
      form.set('wichtigkeit', '');
      setSent(true);
    } catch {
      setError(tx('Das Senden hat nicht geklappt — vermutlich fehlt die Verbindung. Dein Text ist noch da, versuch es gleich nochmal.'));
    } finally {
      setSubmitting(false);
    }
  }, [cfg, page, event, question, antwort, anmerkung, wichtigkeit, epId, ensureParticipant, form]);

  const sendContact = useCallback(async () => {
    if (!cfg || !page || !event || !participant) return;
    const evApp = epId('list', 'veranstaltungen');
    if (!evApp) return;
    setMailBusy(true);
    setMailError(null);
    try {
      // an anonymous visitor cannot edit the registration — the contact is created as its own entry with the same Kürzel
      await createPublicRecord(cfg, page, {
        veranstaltung: recordRef(cfg, page, evApp, event.id),
        kuerzel: participant.kuerzel,
        email: email.trim(),
        einwilligung: true,
        einwilligung_zeitpunkt: nowIso(),
      });
      writeParticipant(event.id, { ...participant, kontaktGesendet: true });
      setParticipant({ ...participant, kontaktGesendet: true });
      setMailDone(true);
    } catch {
      setMailError(tx('Das hat nicht geklappt. Bitte versuch es gleich nochmal.'));
    } finally {
      setMailBusy(false);
    }
  }, [cfg, page, event, participant, email, epId]);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }

  const wichtigkeitOptions = [
    { key: 'niedrig', label: tx('Niedrig') },
    { key: 'mittel', label: tx('Mittel') },
    { key: 'hoch', label: tx('Hoch') },
  ];
  const mailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const contactDone = mailDone || participant?.kontaktGesendet === true;

  let body: React.ReactNode;
  if (!eventParam) {
    body = <p className="text-sm text-muted-foreground">{tx('Dieser Link ist unvollständig. Bitte scanne den QR-Code der Veranstaltung noch einmal.')}</p>;
  } else if (!eventLoaded) {
    body = <p className="text-sm text-muted-foreground">{tx('Einen Moment …')}</p>;
  } else if (!event) {
    body = <p className="text-sm text-muted-foreground">{tx('Diese Veranstaltung haben wir nicht gefunden. Bitte scanne den QR-Code noch einmal.')}</p>;
  } else {
    body = (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{event.titel}</h2>
          {event.ort && <p className="text-sm text-muted-foreground">{event.ort}</p>}
        </div>

        {!questionLoaded ? (
          <p className="text-sm text-muted-foreground">{tx('Einen Moment …')}</p>
        ) : !question ? (
          <div className="rounded-xl border bg-muted/40 p-5 text-center space-y-2">
            <IconClockHour4 size={40} className="mx-auto text-muted-foreground" stroke={1.5} />
            <p className="font-medium">{tx('Gleich geht es los!')}</p>
            <p className="text-sm text-muted-foreground">{tx('Im Moment ist keine Frage geöffnet. Diese Seite aktualisiert sich von selbst, sobald die nächste Frage da ist.')}</p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); void submit(); }}
          >
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              {question.bezeichnung && <p className="text-xs font-medium text-muted-foreground mb-1">{question.bezeichnung}</p>}
              <p className="font-medium whitespace-pre-wrap">{question.fragestellung}</p>
            </div>

            {sent && participant && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-start gap-2" role="status">
                <IconCheck size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{tx('Danke, dein Beitrag ist angekommen! Du kannst gern noch einen schreiben.')}</p>
                  <p>{tx`Dein Kürzel: ${participant.kuerzel}`}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mm-antwort">{tx('Dein Beitrag')}</Label>
              <Textarea
                id="mm-antwort"
                rows={4}
                value={antwort}
                onFocus={warmUp}
                onChange={e => form.set('antwort', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mm-anmerkung">{tx('Anmerkung (optional)')}</Label>
              <Textarea id="mm-anmerkung" rows={2} value={anmerkung} onChange={e => form.set('anmerkung', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label id="mm-wichtig-label">{tx('Wie wichtig ist dir das? (optional)')}</Label>
              <ChoiceGroup
                id="mm-wichtig"
                aria-labelledby="mm-wichtig-label"
                value={wichtigkeit}
                onChange={k => form.set('wichtigkeit', k ?? '')}
                options={wichtigkeitOptions}
                allowClear
              />
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? tx('Wird gesendet …') : tx('Beitrag senden')}
            </Button>
          </form>
        )}

        {participant && (
          <div className="border-t pt-5 space-y-3">
            <p className="text-sm text-muted-foreground">{tx`Dein Kürzel: ${participant.kuerzel}`}</p>
            {contactDone ? (
              <p className="text-sm flex items-center gap-2"><IconMailHeart size={18} className="shrink-0" />{tx('Danke, deine E-Mail-Adresse ist gespeichert.')}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">{tx('Zum Schluss: Möchtest du von uns hören? (freiwillig)')}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="mm-email">{tx('E-Mail-Adresse')}</Label>
                  <Input id="mm-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="mm-consent" checked={consent} onCheckedChange={v => setConsent(v === true)} className="mt-0.5" />
                  <Label htmlFor="mm-consent" className="font-normal leading-snug">{tx('Ich willige in die Speicherung meiner E-Mail-Adresse ein')}</Label>
                </div>
                {mailError && <p className="text-sm text-destructive" role="alert">{mailError}</p>}
                <p className="text-xs text-muted-foreground">{tx('Wenn du nichts eintragen möchtest, lass das Feld einfach leer — nein, danke ist völlig in Ordnung.')}</p>
                <Button type="button" variant="outline" className="w-full" disabled={!mailValid || !consent || mailBusy} onClick={() => void sendContact()}>
                  {mailBusy ? tx('Wird gesendet …') : tx('E-Mail-Adresse speichern')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return <PublicShell title={page.title} description={page.description}>{body}</PublicShell>;
}
