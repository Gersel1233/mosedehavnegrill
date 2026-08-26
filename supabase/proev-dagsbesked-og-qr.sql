-- ============================================================
--  PRØVE AF QR-SPÆRREN OG DAGSBESKEDENS TITEL  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER dagsbesked-og-qr.sql.
--
--  ⚠️ PRØVE 0 ER DEN VIGTIGSTE. De prøver, der måler at GÆSTEN
--  afvises, er værdiløse på en database, hvor rollen anon slet
--  ikke har skriveret — så bliver hun afvist uanset hvad. Det
--  skete i proev-dagsregler.sql: tre prøver sagde BESTOD, også
--  med værnet revet ud.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-q', 'Forretning Q', 'Vej 1', '2670', 'Greve', '11111111')
on conflict (id) do nothing;

insert into public.borde (lokation_id, nummer, pladser, placering, aktiv, sortering)
select 'proev-q', '7', 4, 'ude', true, 10
 where not exists (
   select 1 from public.borde
    where lokation_id = 'proev-q' and lower(btrim(nummer)) = '7');

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

create or replace function pg_temp.bestil(
  p_ref text, p_bord text default null, p_tlf text default '20304050',
  p_tid time default '12:00')
returns boolean language plpgsql as $$
begin
  insert into public.bestillinger
    (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer)
  values ('proev-q', p_ref, 'Gæst', p_tlf, current_date + 4, p_tid,
          '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1,
          case when p_bord is null then 'afhentning' else 'spis_her' end, p_bord);
  return true;
exception when others then return false;
end $$;

-- =============== 0) KAN GÆSTEN OVERHOVEDET SKRIVE? ==========
do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan)
    values ('proev-q', 'PQ-0', 'Gæst', '20304077', current_date + 40, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'afhentning');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar(
    '0. Gæsten KAN skrive (uden den måler QR-prøverne intet)', gik);
end $$;

-- =============== 1) UDEN INDSTILLINGEN ER QR ÅBEN ===========
/* En forretning, der aldrig har rørt fluebenet, skal ikke opdage,
   at bordene holdt op med at virke. */
select pg_temp.svar('1. Uden indstillingen er QR åben',
  pg_temp.bestil('PQ-1', '7', '20304060'));

-- =============== 2) SLÅET TIL ER STADIG ÅBEN ================
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('proev-q', 'bordbestilling_aaben', 'true'::jsonb, now())
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

select pg_temp.svar('2. Slået til: QR går igennem',
  pg_temp.bestil('PQ-2', '7', '20304061'));

-- =============== 3) SLÅET FRA AFVISES =======================
update public.indstillinger set vaerdi = 'false'::jsonb
 where lokation_id = 'proev-q' and noegle = 'bordbestilling_aaben';

select pg_temp.svar('3. Slået fra: en QR-bestilling afvises',
  not pg_temp.bestil('PQ-3', '7', '20304062'));

-- =============== 4) ⚠️ LUGEN ER IKKE RAMT ===================
/* Den fejl, der ville koste mest: spærren skal KUN gælde
   bordene. Ramte den hjemmesidens bestillinger med, ville en
   forretning, der slog QR fra en travl lørdag, lukke hele
   take-away-forretningen uden at vide det. */
select pg_temp.svar('4. Lugens egne bestillinger går STADIG igennem',
  pg_temp.bestil('PQ-4', null, '20304063'));

-- =============== 5) OG BORDBOOKINGEN ER IKKE RAMT ===========
/* At booke et bord er ikke at bestille fra det. Spærrede QR også
   bookingerne, kunne gæsten ikke reservere plads — og det var
   ikke det, fluebenet lovede. */
do $$
declare gik boolean := true;
begin
  begin
    insert into public.bordbestillinger
      (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-q', 'PQ-B1', 'Gæst', '20304064', current_date + 4, '18:00', 4);
  exception when others then gik := false;
  end;
  perform pg_temp.svar('5. Et bord kan STADIG bookes, når QR er spærret', gik);
end $$;

-- =============== 6) GÆSTEN SELV, MED RLS SLÅET TIL ==========
do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan, bord_nummer)
    values ('proev-q', 'PQ-6', 'Gæst', '20304065', current_date + 4, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'spis_her', '7');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('6. Gæsten selv afvises, når QR er spærret', not gik);
end $$;

-- =============== 7) VÆRNET STÅR VED EN STRAMMERE REGEL ======
/* Indstillingerne læses af gæsten i dag. Strammes den regel,
   ville værnet se en tom tabel og lade alt igennem — uden fejl og
   uden spor. Det er dét, security definer forhindrer. */
/* ⚠️ DEN EKSISTERENDE LÆSEREGEL SKAL VÆK, IKKE SUPPLERES.

   Første udgave lagde bare en ny regel med using (false) oven på.
   Adgangsregler er PERMISSIVE og lægges sammen med ELLER — så
   indstillinger_laes_alle (using true) gav stadig adgang, og
   prøven bestod, også med security definer revet ud. En prøve,
   der ikke kan fejle, måler ingenting. MÅLT: fejl D i
   gennemgangen 26/8 gik lige igennem. */
do $$
declare gik boolean;
begin
  execute 'drop policy if exists indstillinger_laes_alle on public.indstillinger';
  execute 'create policy indstillinger_laes_alle on public.indstillinger '
       || 'for select using (false)';

  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan, bord_nummer)
    values ('proev-q', 'PQ-7', 'Gæst', '20304066', current_date + 4, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'spis_her', '7');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  -- Sat tilbage, så filen kan køres igen.
  execute 'drop policy if exists indstillinger_laes_alle on public.indstillinger';
  execute 'create policy indstillinger_laes_alle on public.indstillinger '
       || 'for select using (true)';

  perform pg_temp.svar(
    '7. Spærren holder, også hvis gæsten ikke må læse indstillingerne', not gik);
end $$;

-- =============== 8) TITLEN FINDES OG ER TEKST ===============
select pg_temp.svar('8. Dagsbeskeden har fået en titel', (
  select count(*) = 1 from information_schema.columns
   where table_schema = 'public' and table_name = 'dags_regler'
     and column_name = 'besked_titel' and data_type = 'text'
));

-- =============== 9) ⚠️ STADIG INGEN PERSONDATA ==============
/* Tabellen er offentlig med vilje. En titel er en overskrift til
   gæsten — ikke et sted at skrive "ring til Henning". */
select pg_temp.svar('9. Dagsreglerne bærer stadig ingen persondata', (
  select count(*) = 0 from information_schema.columns
   where table_schema = 'public' and table_name = 'dags_regler'
     and column_name in ('navn', 'telefon', 'email', 'note', 'intern_note')
));

-- =============== 10) DAGSREGLERNE ER IKKE SKREVET VÆK =======
/* Filen erstatter mosede_dag_aaben. Glemmer den et af de gamle
   spørgsmål, er en hel fils arbejde tabt uden en fejl. */
insert into public.dags_regler (lokation_id, dato, luk_spis_her)
values ('proev-q', current_date + 5, true)
on conflict (lokation_id, dato) do update set luk_spis_her = true;

do $$
declare gik boolean := true;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan)
    values ('proev-q', 'PQ-10', 'Gæst', '20304067', current_date + 5, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'spis_her');
  exception when others then gik := false;
  end;
  perform pg_temp.svar('10. Dagsreglerne virker stadig efter denne fil', not gik);
end $$;

-- =============== RAPPORTEN ==================================
do $$
declare
  r text := coalesce(current_setting('proev.rapport', true), '(ingen prøver kørte)');
  antal int := (length(r) - length(replace(r, E'\n', '')));
  fejl  int := (length(r) - length(replace(r, 'FEJLEDE', ''))) / 7;
begin
  raise exception E'\n\n===== PRØVE AF QR-SPÆRREN =====\n%\n%\n\n(Afbrydelsen her er med vilje: den ruller prøvens data tilbage.)',
    r,
    case when fejl = 0
      then '✅ ALLE ' || antal || ' AF ' || antal || ' BESTOD'
      else '❌ ' || fejl || ' AF ' || antal || ' FEJLEDE' end;
end $$;

rollback;
