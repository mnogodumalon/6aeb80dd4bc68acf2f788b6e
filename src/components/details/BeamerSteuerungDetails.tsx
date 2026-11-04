import type { BeamerSteuerung, Veranstaltungen, FragenAnDieGruppe, Auswertungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface BeamerSteuerungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: BeamerSteuerung;
  /** N:1-Ziel „Veranstaltungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  veranstaltungenList: Veranstaltungen[];
  /** Klick auf die Veranstaltungen-Relation → overlay.push auf dessen Detail. */
  onOpenVeranstaltungen?: (record: Veranstaltungen) => void;
  /** N:1-Ziel „FragenAnDieGruppe": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  fragenAnDieGruppeList: FragenAnDieGruppe[];
  /** Klick auf die FragenAnDieGruppe-Relation → overlay.push auf dessen Detail. */
  onOpenFragenAnDieGruppe?: (record: FragenAnDieGruppe) => void;
  /** N:1-Ziel „Auswertungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  auswertungenList: Auswertungen[];
  /** Klick auf die Auswertungen-Relation → overlay.push auf dessen Detail. */
  onOpenAuswertungen?: (record: Auswertungen) => void;
}

export function BeamerSteuerungDetails({
  record,
  veranstaltungenList,
  onOpenVeranstaltungen,
  fragenAnDieGruppeList,
  onOpenFragenAnDieGruppe,
  auswertungenList,
  onOpenAuswertungen,
}: BeamerSteuerungDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const veranstaltungTarget = veranstaltungenList.find(r => r.record_id === extractRecordId(record.fields.veranstaltung));
  const frageTarget = fragenAnDieGruppeList.find(r => r.record_id === extractRecordId(record.fields.frage));
  const auswertungTarget = auswertungenList.find(r => r.record_id === extractRecordId(record.fields.auswertung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('beamer_steuerung', 'anzeige')} value={record.fields.anzeige} format="pill" />
        <RecordField label={fieldLabel('beamer_steuerung', 'aktueller_abschnitt')} value={record.fields.aktueller_abschnitt} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('beamer_steuerung', 'veranstaltung')}
          name={veranstaltungTarget?.fields.titel ?? '—'}
          meta={[veranstaltungTarget?.fields.ort, veranstaltungTarget?.fields.veranstaltungscode].filter(Boolean).join(' · ') || undefined}
          onClick={veranstaltungTarget && onOpenVeranstaltungen ? () => onOpenVeranstaltungen!(veranstaltungTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('beamer_steuerung', 'frage')}
          name={frageTarget?.fields.bezeichnung ?? '—'}
          meta={undefined}
          onClick={frageTarget && onOpenFragenAnDieGruppe ? () => onOpenFragenAnDieGruppe!(frageTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('beamer_steuerung', 'auswertung')}
          name={auswertungTarget?.fields.bezeichnung ?? '—'}
          meta={undefined}
          onClick={auswertungTarget && onOpenAuswertungen ? () => onOpenAuswertungen!(auswertungTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.BEAMER_STEUERUNG} recordId={record.record_id} readOnly={!perms.canWrite('beamer_steuerung')} />
    </>
  );
}
