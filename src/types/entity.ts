import type { EntityKind } from './record';

export interface EntityRow {
  id: number;
  kind: EntityKind;
  slug: string;
  name: string;
  nameNormalized: string;
  aliases: string[];
  district: string | null;
  recordCount: number;
}

/** Varlık sayfasındaki "birlikte geçen varlıklar" bloğu (spec 8.5). */
export interface CoOccurringEntity {
  id: number;
  kind: EntityKind;
  slug: string;
  name: string;
  sharedRecords: number;
}

export const ENTITY_PATH: Record<EntityKind, string> = {
  institution: '/kurum',
  company: '/sirket',
  place: '/yer',
};

export const ENTITY_LABEL: Record<EntityKind, string> = {
  institution: 'Kurum',
  company: 'Şirket',
  place: 'Yer',
};
