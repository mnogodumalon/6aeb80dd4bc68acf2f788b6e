import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconPlus, IconPresentation, IconEye, IconCalendarEvent } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { countOf } from '@/config/plan';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn } from '@/components/widgets/KanbanWidget';
import { PublicPageQr } from '@/components/widgets/PublicPageQr';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    veranstaltungen, fragenAnDieGruppe, beitraege, beamerSteuerung,
    setFragenAnDieGruppe, setBeitraege, fetchAll,
  } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'fragenAnDieGruppe') return undefined;
      const next = nextStatus(top.record.fields.status);
      if (!next) return undefined;
      return {
        label: next === 'geoeffnet' ? tx('Frage öffnen') : tx('Frage schließen'),
        onClick: () => { const msg = advanceFrage(top.record); if (msg) undoToast(msg); },
      };
    },
  });
  const enrichedBeitraege = crud.enriched.beitraege;
  const enrichedFragen = crud.enriched.fragenAnDieGruppe;
  const clock = useClock();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusKey = (f: { fields: { status?: unknown } }) => lookupKey(f.fields.status as never) ?? 'vorbereitet';

  function nextStatus(s: unknown): 'geoeffnet' | 'geschlossen' | null {
    const k = lookupKey(s as never);
    if (k === 'geoeffnet') return 'geschlossen';
    if (k === 'geschlossen') return null;
    return 'geoeffnet';
  }

  // Event currently shown: the user's pick, else the one with an open question, else the newest.
  const defaultEventId = useMemo(() => {
    const open = fragenAnDieGruppe.find(f => lookupKey(f.fields.status) === 'geoeffnet');
    const openEvent = open ? extractRecordId(open.fields.veranstaltung) : null;
    if (openEvent) return openEvent;
    const sorted = [...veranstaltungen].sort((a, b) => (b.fields.datum ?? b.createdat).localeCompare(a.fields.datum ?? a.createdat));
    return sorted[0]?.record_id ?? null;
  }, [fragenAnDieGruppe, veranstaltungen]);
  const eventId = selectedId && veranstaltungen.some(v => v.record_id === selectedId) ? selectedId : defaultEventId;
  const event = veranstaltungen.find(v => v.record_id === eventId) ?? null;

  const fragen = useMemo(
    () => enrichedFragen.filter(f => extractRecordId(f.fields.veranstaltung) === eventId),
    [enrichedFragen, eventId],
  );
  const fragenIds = useMemo(() => new Set(fragen.map(f => f.record_id)), [fragen]);
  const openFrage = fragen.find(f => statusKey(f) === 'geoeffnet') ?? null;
  const beitraegeEvent = useMemo(
    () => enrichedBeitraege.filter(b => fragenIds.has(extractRecordId(b.fields.frage) ?? '')),
    [enrichedBeitraege, fragenIds],
  );
  const neue = beitraegeEvent
    .filter(b => (lookupKey(b.fields.freigabe) ?? 'neu') === 'neu')
    .sort((a, b) => (a.fields.eingangszeit ?? a.createdat).localeCompare(b.fields.eingangszeit ?? b.createdat));
  const geprueft = beitraegeEvent.length - neue.length;
  const steuerung = beamerSteuerung.find(b => extractRecordId(b.fields.veranstaltung) === eventId) ?? null;

  const frageLabel = (f: { fields: { bezeichnung?: string; fragestellung?: string } }) =>
    f.fields.bezeichnung || f.fields.fragestellung || tx('Frage');
  const frageName = (id: string | null) => {
    const f = fragen.find(x => x.record_id === id);
    return f ? frageLabel(f) : '';
  };

  // ---- writes -------------------------------------------------------------
  function setFrageStatus(id: string, key: string, prevKey: string) {
    setFragenAnDieGruppe(prev => prev.map(f => f.record_id === id
      ? { ...f, fields: { ...f.fields, status: lookupOption('fragen_an_die_gruppe', 'status', key) } } : f));
    LivingAppsService.updateFragenAnDieGruppeEntry(id, { status: key }).catch(() => { void fetchAll(); });
    return prevKey;
  }

  /** Shared by kanban drag, overlay footer — one write path. Returns the refusal sentence. */
  function moveFrage(id: string, key: string): string | undefined {
    const f = fragen.find(x => x.record_id === id);
    if (!f) return undefined;
    const prev = statusKey(f);
    if (prev === key) return undefined;
    if (key === 'geoeffnet') {
      const other = fragen.find(x => x.record_id !== id && statusKey(x) === 'geoeffnet');
      if (other) return tx`Es ist schon „${frageLabel(other)}“ geöffnet — bitte erst schließen.`;
    }
    setFrageStatus(id, key, prev);
    const name = frageLabel(f);
    const label = LOOKUP_OPTIONS['fragen_an_die_gruppe']?.['status']?.find(o => o.key === key)?.label ?? key;
    undoToast(tx`${name} — ${label}`, () => setFrageStatus(id, prev, key));
    return undefined;
  }
  function advanceFrage(f: { record_id: string; fields: { status?: unknown } }): string | undefined {
    const next = nextStatus(f.fields.status);
    return next ? moveFrage(f.record_id, next) : undefined;
  }

  function setFreigabe(id: string, key: string, prevKey: string) {
    setBeitraege(prev => prev.map(b => b.record_id === id
      ? { ...b, fields: { ...b.fields, freigabe: lookupOption('beitraege', 'freigabe', key) } } : b));
    LivingAppsService.updateBeitraegeEntry(id, { freigabe: key }).catch(() => { void fetchAll(); });
    return prevKey;
  }
  function releaseBeitrag(id: string, key: 'freigegeben' | 'ausgeblendet') {
    const b = beitraege.find(x => x.record_id === id);
    const prev = lookupKey(b?.fields.freigabe) ?? 'neu';
    setFreigabe(id, key, prev);
    undoToast(key === 'freigegeben' ? tx('Für den Beamer freigegeben') : tx('Beitrag ausgeblendet'), () => setFreigabe(id, prev, key));
  }
  function releaseAllNew() {
    const ids = neue.map(b => b.record_id);
    ids.forEach(id => setFreigabe(id, 'freigegeben', 'neu'));
    undoToast(tx`${countOf('beitraege', ids.length, appLabel('beitraege'))} freigegeben`, () => ids.forEach(id => setFreigabe(id, 'neu', 'freigegeben')));
  }

  function toggleSofort(f: { record_id: string; fields: { beitraege_sofort_zeigen?: boolean } }) {
    const prev = !!f.fields.beitraege_sofort_zeigen;
    const apply = (v: boolean) => {
      setFragenAnDieGruppe(p => p.map(x => x.record_id === f.record_id ? { ...x, fields: { ...x.fields, beitraege_sofort_zeigen: v } } : x));
      LivingAppsService.updateFragenAnDieGruppeEntry(f.record_id, { beitraege_sofort_zeigen: v }).catch(() => { void fetchAll(); });
    };
    apply(!prev);
    undoToast(!prev ? tx('Beiträge werden sofort gezeigt') : tx('Beiträge werden erst nach Freigabe gezeigt'), () => apply(prev));
  }

  async function showOnBeamer() {
    if (!eventId || !openFrage) return;
    const frageUrl = createRecordUrl(APP_IDS.FRAGEN_AN_DIE_GRUPPE, openFrage.record_id);
    try {
      if (steuerung) {
        const old = { anzeige: lookupKey(steuerung.fields.anzeige) ?? undefined, frage: steuerung.fields.frage };
        await LivingAppsService.updateBeamerSteuerungEntry(steuerung.record_id, { anzeige: 'frage_beitraege', frage: frageUrl });
        undoToast(tx('Frage läuft jetzt auf dem Beamer'), () => {
          LivingAppsService.updateBeamerSteuerungEntry(steuerung.record_id, old).then(() => fetchAll()).catch(() => {});
        });
      } else {
        crud.beamerSteuerung.openCreate({ veranstaltung: eventId, anzeige: 'frage_beitraege', frage: openFrage.record_id });
      }
    } catch { /* surfaced by the error bus */ }
    void fetchAll();
  }

  // ---- kanban -------------------------------------------------------------
  const columns = (LOOKUP_OPTIONS['fragen_an_die_gruppe']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label })) as KanbanColumn[];
  const cards: KanbanCard[] = [...fragen]
    .sort((a, b) => (a.fields.laufende_nummer ?? 0) - (b.fields.laufende_nummer ?? 0))
    .map(f => {
      const mine = beitraegeEvent.filter(b => extractRecordId(b.fields.frage) === f.record_id);
      const neuCount = mine.filter(b => (lookupKey(b.fields.freigabe) ?? 'neu') === 'neu').length;
      const k = statusKey(f);
      return {
        id: `frage:${f.record_id}`,
        column: k,
        title: frageLabel(f),
        subtitle: neuCount > 0
          ? tx`${countOf('beitraege', mine.length, appLabel('beitraege'))} · ${neuCount} neu`
          : countOf('beitraege', mine.length, appLabel('beitraege')),
        tone: k === 'geoeffnet' ? 'success' : k === 'vorbereitet' ? 'primary' : 'default',
      };
    });

  const day = format(clock, 'EEEE', { locale: dateFnsLocale() });
  const context = !event
    ? tx('Lege deine erste Veranstaltung an, dann kann die Gruppe loslegen.')
    : openFrage
      ? neue.length > 0
        ? tx`Offen ist „${frageLabel(openFrage)}“ — ${namen(neue.map(b => b.teilnehmerName || b.fields.sendekennung || ''))} warten auf deine Freigabe.`
        : tx`Offen ist „${frageLabel(openFrage)}“ bei „${event.fields.titel ?? ''}“ — alle Beiträge sind geprüft.`
      : tx`Bei „${event.fields.titel ?? ''}“ ist gerade keine Frage geöffnet — heute ist ${day}, öffne die nächste.`;

  const hasEvents = veranstaltungen.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crud.veranstaltungen.canWrite && (
            <Button variant="outline" onClick={() => crud.veranstaltungen.openCreate({})}>
              <IconCalendarEvent size={16} className="shrink-0" />{tx('Neue Veranstaltung')}
            </Button>
          )}
          {event && crud.fragenAnDieGruppe.canWrite && (
            <Button onClick={() => crud.fragenAnDieGruppe.openCreate({ veranstaltung: event.record_id, status: 'vorbereitet' })}>
              <IconPlus size={16} className="shrink-0" />{tx('Neue Frage')}
            </Button>
          )}
        </div>
      </div>

      {veranstaltungen.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {veranstaltungen.map(v => (
            <Button
              key={v.record_id}
              size="sm"
              variant={v.record_id === eventId ? 'default' : 'outline'}
              onClick={() => setSelectedId(v.record_id)}
            >
              {v.fields.titel ?? tx('Veranstaltung')}
            </Button>
          ))}
        </div>
      )}

      <DashboardGrid
        variant="wide"
        hero={!hasEvents ? (
          <HeroBanner
            icon={<IconCalendarEvent size={18} />}
            action={{ label: tx('Erste Veranstaltung anlegen'), onClick: () => crud.veranstaltungen.openCreate({}) }}
          >
            {tx('Noch keine Veranstaltung — lege eine an und stelle der Gruppe die erste Frage.')}
          </HeroBanner>
        ) : neue.length >= 5 ? (
          <HeroBanner
            icon={<IconEye size={18} />}
            action={{ label: tx('Alle freigeben'), onClick: releaseAllNew }}
          >
            <b>{namen(neue.map(b => b.teilnehmerName || b.fields.sendekennung || ''), 3)}</b> {tx('und weitere haben Beiträge geschickt — sie warten auf die Freigabe für den Beamer.')}
          </HeroBanner>
        ) : undefined}
        kpis={event ? (
          <StatStrip>
            <StatStripItem
              title={tx('Geprüft')}
              value={`${geprueft}/${beitraegeEvent.length}`}
              tone={neue.length > 0 ? 'warning' : 'success'}
            />
            <StatStripItem
              title={tx('Offene Frage')}
              value={openFrage ? frageLabel(openFrage) : tx('keine')}
              tone={openFrage ? 'primary' : 'default'}
              onClick={openFrage ? () => crud.fragenAnDieGruppe.openDetail(fragenAnDieGruppe.find(f => f.record_id === openFrage.record_id)!) : undefined}
            />
          </StatStrip>
        ) : undefined}
        primary={
          <KanbanWidget
            cards={cards}
            columns={columns}
            onCardClick={(c) => {
              const rec = fragenAnDieGruppe.find(f => f.record_id === c.id.split(':')[1]);
              if (rec) crud.fragenAnDieGruppe.openDetail(rec);
            }}
            onCardMove={(id, col) => moveFrage(id.split(':')[1] ?? '', col)}
            onAddCard={crud.fragenAnDieGruppe.canWrite && event
              ? (col) => crud.fragenAnDieGruppe.openCreate({ veranstaltung: event.record_id, status: col })
              : undefined}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Neue Beiträge')}
              items={neue.map(b => ({
                id: b.record_id,
                title: b.fields.antwort ?? '',
                secondLine: (
                  <>
                    <span className="text-muted-foreground">{b.teilnehmerName || b.fields.sendekennung || ''} · {frageName(extractRecordId(b.fields.frage))} · </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="font-medium text-destructive cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); releaseBeitrag(b.record_id, 'ausgeblendet'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); releaseBeitrag(b.record_id, 'ausgeblendet'); } }}
                    >{tx('Ausblenden')}</span>
                  </>
                ),
                action: { label: tx('Freigeben'), onClick: () => releaseBeitrag(b.record_id, 'freigegeben') },
              }))}
              onItemClick={(id) => {
                const rec = beitraege.find(b => b.record_id === id);
                if (rec) crud.beitraege.openDetail(rec);
              }}
              empty={{
                text: openFrage
                  ? tx`Alles geprüft — neue Beiträge zu „${frageLabel(openFrage)}“ erscheinen hier sofort.`
                  : tx('Noch nichts zu prüfen — öffne eine Frage, dann kommen Beiträge herein.'),
              }}
            />
            {event && (
              <div className="rounded-[27px] bg-card shadow-lg p-5 overflow-hidden space-y-3 min-w-0">
                <h2 className="text-sm font-semibold">{tx('Mitmachen & Beamer')}</h2>
                <div className="flex justify-center">
                  <PublicPageQr entity="veranstaltungen" recordId={event.record_id} size={140} title={tx('QR-Code zum Mitmachen')} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!openFrage} onClick={() => void showOnBeamer()}>
                    <IconPresentation size={16} className="shrink-0" />{tx('Auf Beamer zeigen')}
                  </Button>
                  {openFrage && (
                    <Button
                      size="sm"
                      variant={openFrage.fields.beitraege_sofort_zeigen ? 'default' : 'outline'}
                      onClick={() => toggleSofort(openFrage)}
                    >
                      {tx('Beiträge sofort zeigen')}
                    </Button>
                  )}
                </div>
                {!openFrage && (
                  <p className="text-xs text-muted-foreground">{tx('Der Beamer zeigt die Frage, sobald eine geöffnet ist.')}</p>
                )}
              </div>
            )}
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
