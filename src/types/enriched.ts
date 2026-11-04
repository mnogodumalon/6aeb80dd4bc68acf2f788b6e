import type { Auswertungen, BeamerSteuerung, Beitraege, FragenAnDieGruppe, Teilnehmende } from './app';

export type EnrichedTeilnehmende = Teilnehmende & {
  veranstaltungName: string;
};

export type EnrichedFragenAnDieGruppe = FragenAnDieGruppe & {
  quell_auswertungName: string;
  veranstaltungName: string;
};

export type EnrichedBeitraege = Beitraege & {
  teilnehmerName: string;
  frageName: string;
};

export type EnrichedAuswertungen = Auswertungen & {
  frageName: string;
  beitraegeName: string;
};

export type EnrichedBeamerSteuerung = BeamerSteuerung & {
  veranstaltungName: string;
  frageName: string;
  auswertungName: string;
};
