-- 0024 — drop the emirname -> karar synonym
--
-- "karar" is a generic word (17k records), so a search for "emirname" expanded
-- to nearly the whole archive: 16326 of its 17547 hits never contained
-- "emirname" (measured 2026-09-25). The row is also removed from the 0007
-- insert list, because the migration runner replays every file on each run.
delete from search_synonyms where term = 'emirname' and alternative = 'karar';
