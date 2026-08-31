import { docTypeLabel } from '@/lib/constants/doc-types';
import { toIsoDate } from '@/lib/text/dates';
import type { RecordDetail } from '@/types/record';

import { SITE_NAME, SITE_URL, SOURCE_NAME, absoluteUrl } from './config';

/** Spec 8.3 — sayfa tiplerine göre şema seçimi. */

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'tr',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: SITE_URL + '/ara?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; href?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

const LEGISLATION_TYPES = new Set([
  'yasa',
  'yasa_gucunde_kararname',
  'tuzuk',
  'emirname',
  'yasa_tasarisi',
  'yasa_onerisi',
]);

const JOB_TYPES = new Set(['munhal_ilani']);

/**
 * Kayıt sayfası şeması. Üç yol var ve seçim veriye bakıyor, sayfaya değil:
 *
 *   mevzuat  -> Legislation
 *   münhal   -> JobPosting, YALNIZCA deadline_at doluysa
 *   diğer    -> Article
 *
 * JobPosting'in `validThrough` alanı zorunlu. Boş `deadline_at` ile basılırsa
 * Search Console hata üretir ve tüm sayfa tipini riske atar (spec 8.3), o yüzden
 * o kayıtlar Article'a düşüyor.
 */
export function recordJsonLd(record: RecordDetail) {
  const url = absoluteUrl('/karar/' + record.slug);
  const name = record.summary ?? record.title;
  const datePublished = toIsoDate(record.publishedAt);
  const institution = record.entities.find((entity) => entity.kind === 'institution');

  const publisher = {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
  };

  if (JOB_TYPES.has(record.docType) && record.deadlineAt) {
    return {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: name,
      description: record.bodyText ?? record.title,
      datePosted: datePublished,
      validThrough: toIsoDate(record.deadlineAt),
      employmentType: 'FULL_TIME',
      hiringOrganization: {
        '@type': 'GovernmentOrganization',
        name: institution?.name ?? 'Kuzey Kıbrıs Türk Cumhuriyeti',
        ...(institution ? { url: absoluteUrl('/kurum/' + institution.slug) } : {}),
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'CY',
          addressRegion: 'Kuzey Kıbrıs',
        },
      },
      url,
      isBasedOn: record.issue.pdfUrl,
    };
  }

  if (LEGISLATION_TYPES.has(record.docType)) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Legislation',
      name,
      alternateName: record.title,
      legislationIdentifier: record.refNumber ?? undefined,
      legislationDate: datePublished,
      legislationType: docTypeLabel(record.docType),
      jurisdiction: {
        '@type': 'AdministrativeArea',
        name: 'Kuzey Kıbrıs Türk Cumhuriyeti',
      },
      inLanguage: 'tr',
      url,
      isBasedOn: record.issue.pdfUrl,
      publisher,
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: name,
    alternativeHeadline: record.title,
    datePublished,
    inLanguage: 'tr',
    url,
    isBasedOn: record.issue.pdfUrl,
    publisher,
    isPartOf: {
      '@type': 'PublicationIssue',
      issueNumber: record.issue.number,
      datePublished: toIsoDate(record.issue.publishedAt),
      name: SOURCE_NAME + ' sayı ' + record.issue.number + '/' + record.issue.year,
    },
  };
}

export function institutionJsonLd(entity: { name: string; slug: string; recordCount: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name: entity.name,
    url: absoluteUrl('/kurum/' + entity.slug),
    areaServed: { '@type': 'AdministrativeArea', name: 'Kuzey Kıbrıs Türk Cumhuriyeti' },
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
