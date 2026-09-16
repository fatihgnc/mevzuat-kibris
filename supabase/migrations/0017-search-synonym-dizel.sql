-- 0017 — "dizel" synonym gap (reported on Reddit: searching "dizel" found
-- nothing, even though the fuel-price record's title spells out the fuel by
-- name). The record uses the legal/official terms "MOTORİN(MAZOT)" and the
-- anglicised "EURO DIESEL" -- it never contains "dizel", the word most
-- Turkish speakers would actually type. Same synonym-gap class as
-- kamulastirma/istimlak in 0007, closed the same way.
insert into search_synonyms (term, alternative) values
  ('dizel', 'motorin'),
  ('motorin', 'dizel'),
  ('dizel', 'diesel'),
  ('diesel', 'dizel'),
  ('diesel', 'motorin'),
  ('motorin', 'diesel')
on conflict do nothing;
