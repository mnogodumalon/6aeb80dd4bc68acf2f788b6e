import type { Auswertungen, FragenAnDieGruppe, Beitraege, BeamerSteuerung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface AuswertungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Auswertungen;
  /** N:1-Ziel „FragenAnDieGruppe": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  fragenAnDieGruppeList: FragenAnDieGruppe[];
  /** Klick auf die FragenAnDieGruppe-Relation → overlay.push auf dessen Detail. */
  onOpenFragenAnDieGruppe?: (record: FragenAnDieGruppe) => void;
  /** N:1-Ziel „Beitraege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  beitraegeList: Beitraege[];
  /** Reserviert — Beitraege ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenBeitraege?: (record: Beitraege) => void;
  /** 1:N „Fragen an die Gruppe" (quell_auswertung): VOLLE Liste — der Block filtert auf diesen Record. */
  fragenAnDieGruppeQuellAuswertungList: FragenAnDieGruppe[];
  /** Zeilen-Klick → overlay.push auf das FragenAnDieGruppe-Detail (nie der Edit-Dialog). */
  onOpenFragenAnDieGruppeQuellAuswertung: (record: FragenAnDieGruppe) => void;
  /** Kontextuelles „+": öffnet den FragenAnDieGruppe-Dialog mit diesem Record vorgesetzt. */
  onAddFragenAnDieGruppeQuellAuswertung?: () => void;
  /** 1:N „Beamer-Steuerung" (auswertung): VOLLE Liste — der Block filtert auf diesen Record. */
  beamerSteuerungList: BeamerSteuerung[];
  /** Zeilen-Klick → overlay.push auf das BeamerSteuerung-Detail (nie der Edit-Dialog). */
  onOpenBeamerSteuerung: (record: BeamerSteuerung) => void;
  /** Kontextuelles „+": öffnet den BeamerSteuerung-Dialog mit diesem Record vorgesetzt. */
  onAddBeamerSteuerung?: () => void;
}

export function AuswertungenDetails({
  record,
  fragenAnDieGruppeList,
  onOpenFragenAnDieGruppe,
  beitraegeList,
  fragenAnDieGruppeQuellAuswertungList,
  onOpenFragenAnDieGruppeQuellAuswertung,
  onAddFragenAnDieGruppeQuellAuswertung,
  beamerSteuerungList,
  onOpenBeamerSteuerung,
  onAddBeamerSteuerung,
}: AuswertungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const frageTarget = fragenAnDieGruppeList.find(r => r.record_id === extractRecordId(record.fields.frage));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('auswertungen', 'beitraege')} value={Array.isArray(record.fields.beitraege) ? record.fields.beitraege.map((u: unknown) => beitraegeList.find(t => t.record_id === extractRecordId(u))?.fields.antwort ?? '—').join(', ') : null} format="text" />
        <RecordField label={fieldLabel('auswertungen', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('auswertungen', 'fassung')} value={record.fields.fassung} format="text" />
        <RecordField label={fieldLabel('auswertungen', 'erstellt_am')} value={record.fields.erstellt_am} format="datetime" />
        <RecordField label={fieldLabel('auswertungen', 'beitraege_stand')} value={record.fields.beitraege_stand} format="datetime" />
        <RecordField label={fieldLabel('auswertungen', 'zusammenstellung')} value={record.fields.zusammenstellung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'ki_antwort')} value={record.fields.ki_antwort} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'abschnitt_1')} value={record.fields.abschnitt_1} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'abschnitt_2')} value={record.fields.abschnitt_2} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'abschnitt_3')} value={record.fields.abschnitt_3} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'abschnitt_4')} value={record.fields.abschnitt_4} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'abschnitt_5')} value={record.fields.abschnitt_5} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'abschnitt_6')} value={record.fields.abschnitt_6} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'notizen')} value={record.fields.notizen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'vorschlaege')} value={record.fields.vorschlaege} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auswertungen', 'bearbeitungsstatus')} value={record.fields.bearbeitungsstatus} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('auswertungen', 'frage')}
          name={frageTarget?.fields.bezeichnung ?? '—'}
          meta={undefined}
          onClick={frageTarget && onOpenFragenAnDieGruppe ? () => onOpenFragenAnDieGruppe!(frageTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('fragen_an_die_gruppe')} · ${fieldLabel('fragen_an_die_gruppe', 'quell_auswertung')}`}
        items={fragenAnDieGruppeQuellAuswertungList.filter(r => extractRecordId(r.fields.quell_auswertung) === record.record_id)}
        map={r => ({ name: r.fields.bezeichnung ?? appLabel('fragen_an_die_gruppe'), meta: undefined })}
        onOpen={onOpenFragenAnDieGruppeQuellAuswertung}
        onAdd={onAddFragenAnDieGruppeQuellAuswertung}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('beamer_steuerung')}
        items={beamerSteuerungList.filter(r => extractRecordId(r.fields.auswertung) === record.record_id)}
        map={() => ({ name: appLabel('beamer_steuerung'), meta: undefined })}
        onOpen={onOpenBeamerSteuerung}
        onAdd={onAddBeamerSteuerung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.AUSWERTUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('auswertungen')} />
    </>
  );
}
