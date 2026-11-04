import type { Beitraege, Teilnehmende, FragenAnDieGruppe, Auswertungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface BeitraegeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Beitraege;
  /** N:1-Ziel „Teilnehmende": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  teilnehmendeList: Teilnehmende[];
  /** Klick auf die Teilnehmende-Relation → overlay.push auf dessen Detail. */
  onOpenTeilnehmende?: (record: Teilnehmende) => void;
  /** N:1-Ziel „FragenAnDieGruppe": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  fragenAnDieGruppeList: FragenAnDieGruppe[];
  /** Klick auf die FragenAnDieGruppe-Relation → overlay.push auf dessen Detail. */
  onOpenFragenAnDieGruppe?: (record: FragenAnDieGruppe) => void;
  /** 1:N „Auswertungen" (beitraege): VOLLE Liste — der Block filtert auf diesen Record. */
  auswertungenList: Auswertungen[];
  /** Zeilen-Klick → overlay.push auf das Auswertungen-Detail (nie der Edit-Dialog). */
  onOpenAuswertungen: (record: Auswertungen) => void;
  /** Kontextuelles „+": öffnet den Auswertungen-Dialog mit diesem Record vorgesetzt. */
  onAddAuswertungen?: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Auswertungen-Datensatz. */
  onPickAuswertungen?: () => void;
}

export function BeitraegeDetails({
  record,
  teilnehmendeList,
  onOpenTeilnehmende,
  fragenAnDieGruppeList,
  onOpenFragenAnDieGruppe,
  auswertungenList,
  onOpenAuswertungen,
  onAddAuswertungen,
  onPickAuswertungen,
}: BeitraegeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const teilnehmerTarget = teilnehmendeList.find(r => r.record_id === extractRecordId(record.fields.teilnehmer));
  const frageTarget = fragenAnDieGruppeList.find(r => r.record_id === extractRecordId(record.fields.frage));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('beitraege', 'antwort')} value={record.fields.antwort} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('beitraege', 'anmerkung')} value={record.fields.anmerkung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('beitraege', 'wichtigkeit')} value={record.fields.wichtigkeit} format="pill" />
        <RecordField label={fieldLabel('beitraege', 'sendekennung')} value={record.fields.sendekennung} format="text" />
        <RecordField label={fieldLabel('beitraege', 'freigabe')} value={record.fields.freigabe} format="pill" />
        <RecordField label={fieldLabel('beitraege', 'eingangszeit')} value={record.fields.eingangszeit} format="datetime" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('beitraege', 'teilnehmer')}
          name={teilnehmerTarget?.fields.kuerzel ?? '—'}
          meta={[teilnehmerTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={teilnehmerTarget && onOpenTeilnehmende ? () => onOpenTeilnehmende!(teilnehmerTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('beitraege', 'frage')}
          name={frageTarget?.fields.bezeichnung ?? '—'}
          meta={undefined}
          onClick={frageTarget && onOpenFragenAnDieGruppe ? () => onOpenFragenAnDieGruppe!(frageTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('auswertungen')}
        items={auswertungenList.filter(r => Array.isArray(r.fields.beitraege) && r.fields.beitraege.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: r.fields.bezeichnung ?? appLabel('auswertungen'), meta: r.fields.erstellt_am })}
        onOpen={onOpenAuswertungen}
        onAdd={onAddAuswertungen}
        onPick={onPickAuswertungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.BEITRAEGE} recordId={record.record_id} readOnly={!perms.canWrite('beitraege')} />
    </>
  );
}
