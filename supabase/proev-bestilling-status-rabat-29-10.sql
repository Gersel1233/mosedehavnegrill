-- ============================================================
--  PRØVE: "FØLG DIN BESTILLING" OG AFTALERABATTEN  (29/10)
--  ------------------------------------------------------------
--  Kør EFTER bestilling-status-rabat-29-10.sql. Ruller sig selv
--  tilbage (fejlen til sidst er med vilje). Egen forretning, egne
--  koder — låner intet af ejerens data.
-- ============================================================
begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-sr', 'Statusrabatprøven', 'Vej 1', '2670', 'Greve', '11111111')
on conflict (id) do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

insert into public.rabatkoder (lokation_id, kode, navn, procent) values
  ('proev-sr', 'HEMMELIG10', 'Greve Kommune', 10);

set local role anon;
set local request.jwt.claims = '{}';
insert into public.bestillinger
  (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
   linjer, fyld, antal, hvordan, kanal, rabat_kode)
values
  ('SR-1', 'proev-sr', 'Aftalegæst', '20501111', current_date + 1, '12:00',
   '[{"navn":"PRØVEVARE-SR","antal":2,"pris":50},{"navn":"PRØVEVARE-SR2","antal":1,"pris":30}]',
   '[]', 3, 'afhentning', 'smoerrebroed', 'hemmelig10'),
  ('SR-2', 'proev-sr', 'Almindelig', '20502222', current_date + 1, '12:05',
   '[{"navn":"PRØVEVARE-SR","antal":1,"pris":50}]',
   '[]', 1, 'afhentning', 'smoerrebroed', null);

do $$
declare r record; tekst text;
begin
  select * into r from public.mosede_bestilling_status('SR-1');
  perform pg_temp.svar('1) gæsten ser aftalens navn og rabatten (10 % af 130 = 13 kr.)',
    r.rabat_navn = 'Greve Kommune' and r.rabat_kr = 13);
  select row_to_json(t)::text into tekst from public.mosede_bestilling_status('SR-1') t;
  perform pg_temp.svar('2) selve koden står ingen steder i svaret',
    tekst not ilike '%HEMMELIG10%');
  perform pg_temp.svar('3) heller ikke navn eller telefon',
    tekst not like '%Aftalegæst%' and tekst not like '%20501111%');
  select * into r from public.mosede_bestilling_status('SR-2');
  perform pg_temp.svar('4) uden kode: ingen rabat', r.rabat_kr is null and r.rabat_navn is null);
end $$;
reset role;

do $$
declare r text := current_setting('proev.rapport', true);
begin
  raise exception E'\n%\n%', r,
    case when r like '%FEJLEDE%' then 'NOGET FEJLEDE' else
      'ALLE ' || (length(r) - length(replace(r, E'\n', ''))) || ' AF '
      || (length(r) - length(replace(r, E'\n', ''))) || ' BESTOD' end;
end $$;
