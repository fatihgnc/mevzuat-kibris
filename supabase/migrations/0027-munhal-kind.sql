-- What kind of vacancy a Kamu Hizmeti Komisyonu circular announces, the three
-- categories the commission's own site files them under: İlk Atama (entry
-- posts), Yükselme (promotion posts) and Öğretmenlik (teaching posts).
--
-- NULL for notices other bodies issued themselves (Polis, Yüksek Savcılar Kurulu,
-- ...): the categories are the commission's and say nothing about those.
-- The topic rail's "İlan türü" filter leaves NULLs under "Tümü" only.

alter table records add column if not exists munhal_kind text;

alter table records drop constraint if exists records_munhal_kind_check;
alter table records add constraint records_munhal_kind_check
  check (munhal_kind is null or munhal_kind in ('ilk_atama', 'yukselme', 'ogretmen'));

create index if not exists records_munhal_kind_idx on records (munhal_kind)
  where munhal_kind is not null;
