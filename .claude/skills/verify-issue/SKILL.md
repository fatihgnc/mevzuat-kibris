---
name: verify-issue
description: Audits one or more Resmi Gazete issues' parsed records against the original source PDF and fixes any gaps by transcribing missing legal text by hand. Use this whenever the user asks to "check", "verify", "compare", "doğrula", or "karşılaştır" a gazette issue (by year + number, by date, or a range/list of numbers) against its PDF, or asks why a record's body looks empty/incomplete/suspicious/contains another decision's text, or wants missing records filled in "like the Tapu Kadastro fix". Always trigger this for requests like "sayı 178'i PDF ile karşılaştır", "176-180 arasını kontrol et", or "bu sayıda eksik var mı bak" even if the user doesn't name the skill.
---

# Verify Issue

Audits every record the ingest pipeline parsed from one KKTC Resmi Gazete issue against
the actual source PDF, and fills in whatever the pipeline missed by transcribing the
PDF pages by hand. This grew out of a real session that found the pipeline silently
skipping an entire EK section (EK IV Bölüm I — 27 records with no page number and no
body at all), plus assorted one-off OCR failures within an otherwise-successful issue,
plus — the sneakiest one — records whose body looked present and non-empty but
actually contained *other* records' full text glued onto the end.

## Why this needs a human-in-the-loop pass, not a script

The ingest pipeline (`scripts/parse-records`, `scripts/extract-text`) locates a
record's body by finding its reference label (`bodyAnchor` in
`scripts/parse-records/parser.ts`) in the extracted PDF text, then takes everything up
to the *next* label it recognizes as the end boundary. That fails silently in four
known ways, and none of them are fixable by re-running the pipeline:

1. **No reference number at all.** EK I laws and decrees (`yasa`,
   `yasa_gucunde_kararname`) often have no ref number in the contents cell — the
   parser was never going to find them (`bodyAnchor` returns `null` when
   `refType`/`refNumber` are null). `page_from`/`page_to`/`body_markdown` all stay
   `null` forever.
2. **A record inside an otherwise-successful cluster silently gets no body.** E.g. two
   out of six Rekabet Kurulu decisions in a row had `page_from` set (so the anchor
   *was* found) but `body_markdown` stayed `null` — OCR just didn't produce output for
   those two.
3. **A whole EK section gets skipped.** In the 2026/177 case, EK IV Bölüm I (Bakanlar
   Kurulu Kararları, 31 records) had `page_from` and `body_markdown` both null across
   the board, while the rest of the same issue (MAIN + EK III, ~40 records) was fine.
4. **A record's body runs past its own end and swallows the next one(s) whole.** In the
   same EK IV Bölüm I cluster, exactly the handful of records the (older, pre-fix)
   extraction *did* find an anchor for each had their body run all the way to the
   *next record it managed to find an anchor for* — which, because most of the
   in-between records had no anchor found at all, meant one record's body silently
   absorbed the complete text of two, three, sometimes many neighboring decisions.
   `select id, slug from records where id = 103195` looked totally fine by every
   `is null` check — it had a body, a page number, everything — the extra text was
   just sitting there at the end, invisible unless you actually read to the bottom of
   the rendered page. **This means "has a non-null body" is not sufficient evidence a
   record is correct — always check category 4 even for records nothing else flagged.**

None of these are things you can fix by tweaking a regex and re-running extraction —
the source text needs a human (well, you) to actually look at the PDF pages and
transcribe them, or in category 4's case, to actually look at where a body's content
*stops matching its own title* and cut there. That's the reason this skill is a
checklist you follow, not a script you run. The mechanical parts (querying the DB,
downloading the PDF, splitting it into pages, finding page boundaries, detecting
category-4 bleed) *are* scriptable and you should script them — see below — but the
transcription and the "where does this record actually end" judgment call are
inherently manual.

## Inputs

The user gives you a year + one or more issue numbers (e.g. "sayı 178, 2026",
"2026/178", "176-178'i kontrol et", "178, 179 ve 180'e bak"), a date range, or just a
range of numbers within a year — resolve whatever form they used into a concrete list
of `(year, number)` pairs up front, in one query, rather than asking them to repeat
themselves per issue:

```sql
select id, year, number, published_at, pdf_url, text_status
from issues
where (year, number) in ((2026, 178), (2026, 179), (2026, 180))
-- or: where published_at between '2026-09-18' and '2026-09-20'
-- or: where year = 2026 and number between 178 and 180
order by number
```

Don't assume a PDF is already sitting in the scratchpad from a previous session —
always fetch it fresh per issue (see Step 2).

**Multiple issues means running Steps 1–7 once per issue, not pooling them into one
pass.** Each issue gets its own PDF, its own page numbering, its own set of anchors —
mixing two issues' pages together is exactly the kind of boundary mistake this skill
exists to catch (see gap category 4), so don't invite it into your own working process.
What you *should* pool across issues:

- **The go-ahead in Step 4.** Once you've flagged gaps in every requested issue, show
  the user one combined list (grouped by issue) and get one confirmation to write all
  of them, rather than interrupting per issue — that matches how the rest of this
  project asks for DB-write approval (once, with the full scope visible) instead of
  death-by-a-thousand-prompts.
- **The final report in Step 7.** One summary at the end covering every issue you
  touched, not N separate reports.

Everything in between (reading each issue's own PDF pages, transcribing, writing that
issue's fixes) stays per-issue and sequential. If the list is long enough that you're
tempted to parallelize the PDF-reading/transcription work across issues to go faster,
resist it — each issue's transcription needs your full attention on that issue's own
page images, and interleaving them is how a page number or a transcribed paragraph
ends up filed under the wrong issue.

## Step 1 — Pull the full record list and flag gaps

Write a small throwaway script under `scripts/` (pattern: `scripts/_tmp-audit.ts`,
same as every other ad hoc script in this repo — import `sql`/`closeDb` from
`./shared/db`) that joins `records` to `issues` for the given year+number and prints
every record: `id, slug, title, doc_type, ref_type, ref_number, section, page_from,
page_to, length(body_markdown) as body_len, has_own_page`.

Flag a record as needing attention if **any** of:

- `body_len is null` — no body at all, regardless of why.
- `ref_type is null` and `doc_type` is one of `yasa`, `yasa_gucunde_kararname`,
  `tuzuk`, `emirname` (or similar — a real legal instrument, not a personnel/exam
  notice) — this is gap category 1, the parser never had an anchor to search for.
- `page_from is null` but `ref_number` is *not* null — the anchor should have worked
  and didn't; this is often the signal for gap category 3 (a whole EK section
  skipped), so check whether *every* record in that EK section (same `section`
  column) is affected before treating it as an isolated failure.

Then run a **separate check for category 4** (bled-in neighbor content) against every
record that has a non-null body, in or out of the flagged list — this bug hides
precisely in records that otherwise look fine. Count how many times the record's own
kind of anchor pattern appears inside its *own* `body_markdown` — for a `uki`/`ae`
record, count occurrences of `KARAR SAYISI:` or `Ü(K-I)\d+-\d{4}`; for other ref types,
adapt to that type's `bodyAnchor` label from `parser.ts`. More than one occurrence
means the body almost certainly runs past its own end into the next record(s):

```sql
select id, slug,
  (select count(*) from regexp_matches(body_markdown, 'KARAR SAYISI:|Ü\(K-I\)\d+-\d{4}', 'g')) as anchor_hits
from records
where issue_id = <issue id> and body_markdown is not null
order by anchor_hits desc
```

Anything with `anchor_hits > 1` needs the same fix as Step 5 below: find the *next*
record's own anchor marker inside the bled body (that's your cut point — the DB
already tells you what that next record's `ref_number` is from its own row, so you
don't have to guess it), trim everything from there onward, and check the new tail for
a leftover bare page number (the printed page footer, e.g. `\n\n1163` or
`\n\n(1161)\n\n 1162`) that a plain `KARAR SAYISI:`-boundary cut leaves dangling —
strip that too.

Group the flagged records by `section` and by "missing everything" vs "missing body
only" vs "has a body but bled into a neighbor" — this shapes how you read the PDF in
Step 3 (a whole missing section reads as one long continuous sweep through those
pages; scattered single-record gaps need targeted page lookups; a category-4 fix often
needs no PDF reading at all, since the correct neighbor content is either already
sitting in the DB under its own record, or you're about to transcribe it anyway as
part of the same pass).

## Step 2 — Get the PDF and a plain-text page map

```bash
curl -sL -o issueNNN.pdf "<pdf_url from the issues row>"
pdftotext -enc UTF-8 issueNNN.pdf issueNNN_plain.txt
```

Split `issueNNN_plain.txt` on `\f` (form feed — pdftotext's page separator) to get an
array of per-page text, 0-indexed, where PDF page `N` is `pages[N-1]`. Use this array
to *locate* page ranges — grep it for each flagged record's title fragment or its
reference marker (`"Sayı : N"`, `"KARAR SAYISI: Ü(K-I)N-YYYY"`, `"GENELGE MİA.N/YYYY"`)
to find which page it starts on, and take the next flagged-or-known record's start
page (minus one) as its end page.

This step is quick and mechanical (a Python one-liner or a tiny script), but treat its
output as a *lead*, not ground truth — always confirm the actual boundary by reading
the page images in Step 3, since `pdftotext`'s OCR-quality text can mangle a title
just enough to make a naive grep land on the wrong page (this happened with the
Turkish "İ"/"Î" distinction in past runs — `RESMİ` vs `RESMÎ` GAZETE, `MiA` vs `MİA`).

## Step 3 — Read and transcribe

Use the Read tool's `pages` parameter (max 20 pages per call) to view the actual PDF
pages for each flagged record's range. Transcribe the content into clean Markdown by
hand — this is a legal source document, so transcribe faithfully, don't summarize or
paraphrase.

Before you start typing, pull up **one already-correct `body_markdown` of the same
`doc_type`** from the DB as a style reference (`select body_markdown from records
where id = <a known-good sibling>`) and match its conventions:

- `#`/`##`/`###` for the document's own heading hierarchy (title, kısım, madde
  groupings) — don't invent a heading scheme, follow what similar records already use.
- GFM tables for anything tabular (cetvel/tarife/ücret tables) — even wide multi-column
  ones; don't flatten a table into prose.
- **Bold** for field labels in form-style documents (Karar Tarihi, Kurul Üyeleri, etc.)
- Numbered/lettered lists exactly as the source numbers them — (1), (2), (A), (B) —
  don't renumber or restructure.
- A leading `Sayı : N` line (or `KARAR SAYISI: ...` for Bakanlar Kurulu items) matching
  how sibling records in the same section start.

Watch for the masthead-bleed pattern at the very end of your transcription: if the
PDF page break lands mid-record, the next page's running header (`Sayfa: N`, `RESMÎ
GAZETE`, the date, `Sayı: N`, the issuing institution's name) can look like it belongs
to the record you're transcribing — it doesn't, it's the *next* page's masthead. Stop
transcribing at the real end of the record's own content, not at the physical PDF page
boundary.

If a cluster of records shares a near-identical template (e.g. several Rekabet Kurulu
decisions about the same underlying case, differing only in decision number and a few
facts), transcribe the first one in full, then reuse its structure for the rest,
changing only what actually differs — re-reading and re-typing boilerplate that's
identical across records wastes effort and risks introducing small inconsistencies.

## Step 4 — Before writing anything to the DB

**Stop and get the user's explicit go-ahead before running any UPDATE.** There is no
separate dev database here — `scripts/shared/db.ts`'s `sql` connects straight to the
production Supabase instance the live site reads from. Show the user what you found
(how many records, which gap categories) and what you're about to write, the same way
you would before any other production DB write in this repo.

Mention explicitly that a raw UPDATE bypasses the ingest pipeline's own
`triggerRevalidate` call (see `scripts/revalidate/index.ts`), so the fixed pages won't
appear live until someone calls `/api/revalidate` — that's Step 6, not automatic.

## Step 5 — Write the fixes

For each flagged record, `UPDATE records SET body_markdown = ..., page_from = ...,
page_to = ..., has_own_page = true WHERE id = ...`.

`has_own_page` needs setting explicitly — the pipeline sets it as `hasOwnPage =
bodyText.length >= 200 || entities.length > 0` at parse time (see
`scripts/parse-records/index.ts`), so a record that had no body defaulted to `false`
and won't get its own `/karar/<slug>` URL or show as a clickable link on the issue
page until you set it `true` yourself.

**Keep each script's blast radius small.** Batch at most a few dozen records per
script/call — a loop that fires a few hundred UPDATEs in one Bash invocation has
actually tripped Claude Code's auto-permission classifier in this project (it read a
~500-row update loop as something resembling mass deletion and blocked it outright).
Writing each record's markdown to its own scratch file and having a short script read
+ apply them keeps each individual write small and reviewable, and if you do hit that
block, splitting into smaller batches is the fix, not a permission workaround.

Delete every `scripts/_tmp-*.ts` you created once you're done — `git status --short`
should come back empty before you consider the fix finished. These are throwaway,
not meant to be committed.

## Step 6 — Verify locally, then offer to go live

Start (or reuse) this repo's own dev server — `.claude/launch.json` already has a
`mevzuat-kibris-3065` config, use the Browser tool's `preview_start` with that name
rather than guessing a bare port. Visit a few of the freshly-written `/karar/<slug>`
pages and the issue's `/sayilar/<year>/<number>` listing to confirm:

- the body actually renders (not the "kararın metni gösterilemiyor" fallback card)
- the record shows as a link (the site's accent/teal color) rather than plain black
  text in the issue listing — this is the visible signal that `has_own_page` actually
  took.

If two or more dev servers for this project might be running at once (check
`netstat -ano | grep <port>` if a page looks stuck on stale content), be aware they
share the same `.next` build cache and can corrupt each other's output — a full
`preview_stop` + `preview_start` restart of your own server clears it.

Since Step 5 wrote straight to production and bypassed the automatic revalidate, ask
the user whether to trigger `/api/revalidate` now (with every fixed record's slug and
every touched issue's year/number, across all issues if you did more than one) so the
fix goes live, same as any other production-facing action in this repo — don't fire it
without asking.

## Step 7 — Summarize

Close with a short report: how many records you checked, how many needed fixing
broken down by gap category (missing anchor entirely / one-off missing body within an
otherwise-fine cluster / a whole EK section skipped / had a body but bled into a
neighbor), and the specific slugs worth the user spot-checking themselves — grouped by
issue and by what kind of gap it was, not just a flat list of IDs. Category 4 fixes are
easy to undersell in a summary since "trimmed N characters off the end" sounds minor —
say plainly that the record was showing another decision's full text before the fix,
since that's what the user actually saw and cared about.
