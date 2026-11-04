import type { Teilnehmende, Veranstaltungen, Beitraege } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface TeilnehmendeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Teilnehmende;
  /** N:1-Ziel „Veranstaltungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  veranstaltungenList: Veranstaltungen[];
  /** Klick auf die Veranstaltungen-Relation → overlay.push auf dessen Detail. */
  onOpenVeranstaltungen?: (record: Veranstaltungen) => void;
  /** 1:N „Beiträge" (teilnehmer): VOLLE Liste — der Block filtert auf diesen Record. */
  beitraegeList: Beitraege[];
  /** Zeilen-Klick → overlay.push auf das Beitraege-Detail (nie der Edit-Dialog). */
  onOpenBeitraege: (record: Beitraege) => void;
  /** Kontextuelles „+": öffnet den Beitraege-Dialog mit diesem Record vorgesetzt. */
  onAddBeitraege?: () => void;
}

export function TeilnehmendeDetails({
  record,
  veranstaltungenList,
  onOpenVeranstaltungen,
  beitraegeList,
  onOpenBeitraege,
  onAddBeitraege,
}: TeilnehmendeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const veranstaltungTarget = veranstaltungenList.find(r => r.record_id === extractRecordId(record.fields.veranstaltung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('teilnehmende', 'kuerzel')} value={record.fields.kuerzel} format="text" />
        <RecordField label={fieldLabel('teilnehmende', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('teilnehmende', 'einwilligung')} value={record.fields.einwilligung} format="bool" />
        <RecordField label={fieldLabel('teilnehmende', 'einwilligung_zeitpunkt')} value={record.fields.einwilligung_zeitpunkt} format="datetime" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('teilnehmende', 'veranstaltung')}
          name={veranstaltungTarget?.fields.titel ?? '—'}
          meta={[veranstaltungTarget?.fields.ort, veranstaltungTarget?.fields.veranstaltungscode].filter(Boolean).join(' · ') || undefined}
          onClick={veranstaltungTarget && onOpenVeranstaltungen ? () => onOpenVeranstaltungen!(veranstaltungTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('beitraege')}
        items={beitraegeList.filter(r => extractRecordId(r.fields.teilnehmer) === record.record_id)}
        map={r => ({ name: r.fields.sendekennung ?? appLabel('beitraege'), meta: r.fields.eingangszeit })}
        onOpen={onOpenBeitraege}
        onAdd={onAddBeitraege}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TEILNEHMENDE} recordId={record.record_id} readOnly={!perms.canWrite('teilnehmende')} />
    </>
  );
}
