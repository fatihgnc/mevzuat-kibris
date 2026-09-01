import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * The authority is the hand-written SQL migrations (supabase/migrations/*.sql).
 * This file gives the query layer its types; things drizzle-kit cannot generate,
 * such as generated columns and GIN indexes, are defined there. The db:generate
 * output is used only for diff checking and is never applied directly.
 */

const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => 'tsvector',
});

const textArray = customType<{ data: string[]; driverData: string }>({
  dataType: () => 'text[]',
});

const bigintArray = customType<{ data: number[]; driverData: string }>({
  dataType: () => 'bigint[]',
});

const EMPTY_ARRAY = sql`'{}'`;

export const issues = pgTable(
  'issues',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    year: smallint('year').notNull(),
    number: integer('number').notNull(),
    publishedAt: date('published_at').notNull(),
    pdfUrl: text('pdf_url').notNull(),
    pageCount: smallint('page_count'),
    textStatus: text('text_status').notNull().default('pending'),
    textQuality: real('text_quality'),
    retryCount: smallint('retry_count').notNull().default(0),
    rawIndexHtml: text('raw_index_html'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    yearNumber: uniqueIndex('issues_year_number_key').on(t.year, t.number),
    published: index('issues_published_idx').on(t.publishedAt),
  }),
);

export const records = pgTable(
  'records',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    issueId: bigint('issue_id', { mode: 'number' }).notNull(),
    slug: text('slug').notNull(),
    section: text('section').notNull(),
    docType: text('doc_type').notNull(),
    refType: text('ref_type'),
    refNumber: text('ref_number'),
    title: text('title').notNull(),
    titleNormalized: text('title_normalized').notNull(),
    subject: text('subject'),
    bodyText: text('body_text'),
    summary: text('summary'),
    summarySource: text('summary_source'),
    // Filled in + summary null = the LLM layer tried and produced no safe summary
    // (spec 3.8, tier 3). Stops the same title being re-asked on every run.
    summaryAttemptedAt: timestamp('summary_attempted_at', { withTimezone: true }),
    deadlineAt: date('deadline_at'),
    deadlineNote: text('deadline_note'),
    pageFrom: smallint('page_from'),
    pageTo: smallint('page_to'),
    publishedAt: date('published_at').notNull(),
    relatedRecordId: bigint('related_record_id', { mode: 'number' }),
    correctsId: bigint('corrects_id', { mode: 'number' }),
    hasPersonalData: boolean('has_personal_data').notNull().default(false),
    hasOwnPage: boolean('has_own_page').notNull().default(true),
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugKey: uniqueIndex('records_slug_key').on(t.slug),
    published: index('records_published_idx').on(t.publishedAt),
    docTypePublished: index('records_doctype_published_idx').on(t.docType, t.publishedAt),
    issue: index('records_issue_idx').on(t.issueId),
  }),
);

export const topics = pgTable('topics', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  sortOrder: smallint('sort_order').notNull(),
});

export const recordTopics = pgTable(
  'record_topics',
  {
    recordId: bigint('record_id', { mode: 'number' }).notNull(),
    topic: text('topic').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recordId, t.topic] }),
    byTopic: index('record_topics_topic_idx').on(t.topic, t.recordId),
  }),
);

export const entities = pgTable(
  'entities',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    kind: text('kind').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull(),
    aliases: textArray('aliases').notNull().default(EMPTY_ARRAY),
    district: text('district'),
    meta: jsonb('meta').notNull().default({}),
    recordCount: integer('record_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugKey: uniqueIndex('entities_slug_key').on(t.slug),
    kindCount: index('entities_kind_count_idx').on(t.kind, t.recordCount),
  }),
);

export const recordEntities = pgTable(
  'record_entities',
  {
    recordId: bigint('record_id', { mode: 'number' }).notNull(),
    entityId: bigint('entity_id', { mode: 'number' }).notNull(),
    confidence: real('confidence').notNull().default(1),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recordId, t.entityId] }),
    byEntity: index('record_entities_entity_idx').on(t.entityId, t.recordId),
  }),
);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  digestHour: smallint('digest_hour').notNull().default(8),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alerts = pgTable(
  'alerts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id').notNull(),
    label: text('label').notNull(),
    query: text('query'),
    topics: textArray('topics').notNull().default(EMPTY_ARRAY),
    docTypes: textArray('doc_types').notNull().default(EMPTY_ARRAY),
    entityIds: bigintArray('entity_ids').notNull().default(EMPTY_ARRAY),
    frequency: text('frequency').notNull().default('weekly'),
    preferredWeekday: smallint('preferred_weekday').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUser: index('alerts_user_idx').on(t.userId),
  }),
);

export const alertDeliveries = pgTable(
  'alert_deliveries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    alertId: bigint('alert_id', { mode: 'number' }).notNull(),
    recordIds: bigintArray('record_ids').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull(),
    providerId: text('provider_id'),
  },
  (t) => ({
    bySent: index('alert_deliveries_sent_idx').on(t.sentAt),
  }),
);

export const ingestRuns = pgTable('ingest_runs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  kind: text('kind').notNull(),
  targetYear: smallint('target_year'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: text('status').notNull().default('running'),
  issuesSeen: integer('issues_seen').notNull().default(0),
  issuesNew: integer('issues_new').notNull().default(0),
  recordsNew: integer('records_new').notNull().default(0),
  errors: jsonb('errors').notNull().default([]),
});

export const searchLogs = pgTable('search_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  query: text('query').notNull(),
  resultCount: integer('result_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
