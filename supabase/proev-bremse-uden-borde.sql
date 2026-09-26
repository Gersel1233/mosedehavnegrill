-- ============================================================
--  PRØVE: BORDENE TÆLLER IKKE MED I BREMSEN  (26. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER bremse-uden-borde-26-9.sql. Skriver ingenting, der
--  bliver stående: alt sker i én transaktion, der rulles tilbage.
--
--  Skal skrive: ALLE 14 AF 14 BESTOD.
--
--  ⚠️ DEN ER SET FEJLE. Mod en database uden filen (bremse.sql's
--     udgave) falder prøverne om bordene — og de tre, der måler de
--     GAMLE grænser for mad ud af huset, består begge gange. Tallene
--     står i docs/HISTORIK.md 26/9.
--
--  ⚠️ KULISSEN FYLDES MED BREMSEN SLÅET FRA. De 40 bestillinger, der
--     skal stå i timen, før prøven kan spørge om den 41., må ikke selv
--     blive afvist af den kode, der prøves — ellers ville kulissen
--     falde med den gamle udgave, og prøven ville måle kulissen.
--     Udløseren slås til igen, før den første prøve.
--
--  ⚠️ FEM EGNE FORRETNINGER (proev-bb1..5), så en tælling i én
--     prøve ikke smitter af på den næste — og egne telefonnumre, for
--     nummer-grænsen tæller på tværs af forretninger.
--
--  ⚠️ IDENTITETEN ER SQL (ingen claims), som demoen og personalets
--     prøver. Bremsen spørger ikke om rolle; gæstens egne regler
--     (pris, kategori, dagen) er ikke det, der prøves her, og de
--     prøves i proev-gaestens-vaern-26-9.sql.
-- ============================================================
begin;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;
create sequence pg_temp.ref;

insert into public.lokationer (id, navn, adresse, postnr, by)
select 'proev-bb' || n, 'Prøvehavnen BB ' || n, 'Prøvevej 3' || n, '2670', 'Greve'
  from generate_series(1, 5) n
on conflict (id) do nothing;

-- Døgnåbent alle syv dage: klokken må ikke afgøre, om prøven består.
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-bb' || n, d, false, '00:00', '23:59'
  from generate_series(1, 5) n, generate_series(0, 6) d
on conflict (lokation_id, ugedag) do nothing;

insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-bb' || n, 'bestilling_varsel_timer', '0'::jsonb
  from generate_series(1, 5) n
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

-- To borde pr. forretning, uden nøgle (bord-noegle.sql kræver ingen).
insert into public.borde (lokation_id, nummer, aktiv)
select 'proev-bb' || n, 'PRØVE-BB-' || b, true
  from generate_series(1, 5) n, generate_series(1, 2) b;

create or replace function pg_temp.idag() returns date language sql stable as $$
  select (now() at time zone 'Europe/Copenhagen')::date
$$;

/* Én bestilling. bord = null er mad ud af huset (afhentning om tre
   dage), ellers "spis her" i dag. Hvert kald får sin egen hent_tid,
   så dubletvagten (nummer, dag og tid) aldrig er det, der svarer.
   Svarer null, når den gik igennem, ellers databasens besked. */
create or replace function pg_temp.best(
  lok text, bord text default null, tlf text default null,
  oprettet timestamptz default null)
returns text language plpgsql as $$
declare n int := nextval('pg_temp.ref');
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, antal, linjer,
     hvordan, bord_nummer, oprettet)
  values
    ('PR-BB-' || n, lok, 'Prøve Person',
     case when bord is null then coalesce(tlf, '2690' || lpad(n::text, 4, '0')) else tlf end,
     case when bord is null then pg_temp.idag() + 3 else pg_temp.idag() end,
     time '00:00' + (n % 1440) * interval '1 minute',
     1, '[{"navn":"Kaffe","antal":1,"pris":20}]'::jsonb,
     case when bord is null then 'afhentning' else 'spis_her' end, bord,
     coalesce(oprettet, now()));
  return null;
exception when others then
  return sqlerrm;
end $$;

/* Kulissen: n bestillinger, der SKAL stå. Fejler én, stopper filen —
   så en skæv kulisse aldrig bliver til en grøn eller rød linje. */
create or replace function pg_temp.fyld(
  lok text, antal int, bord text default null, tlf text default null,
  oprettet timestamptz default null)
returns void language plpgsql as $$
declare g text;
begin
  for i in 1..antal loop
    g := pg_temp.best(lok, bord, tlf, oprettet);
    if g is not null then
      raise exception 'KULISSEN FALDT (% af %, %): %', i, antal, lok, g;
    end if;
  end loop;
end $$;

create or replace function pg_temp.nej(nr int, navn text, g text, kode text) returns void
language sql as $$
  insert into _svar values (nr, navn, coalesce(g like '%' || kode || '%', false), coalesce(g, 'GIK IGENNEM'));
$$;
create or replace function pg_temp.ja(nr int, navn text, g text) returns void
language sql as $$
  insert into _svar values (nr, navn, g is null, coalesce(g, 'gik igennem'));
$$;


-- ------------------------------------------------------------
--  KULISSEN — med bremsen slået fra
-- ------------------------------------------------------------
alter table public.bestillinger disable trigger bestilling_bremse;

-- bb1: 40 mad ud af huset i timen.
select pg_temp.fyld('proev-bb1', 40);

-- bb2: 30 fra bordene (15 + 15) og 39 mad ud af huset i timen.
select pg_temp.fyld('proev-bb2', 15, 'PRØVE-BB-1');
select pg_temp.fyld('proev-bb2', 15, 'PRØVE-BB-2');
select pg_temp.fyld('proev-bb2', 39);

-- bb3: 26900001 har bestilt fem gange ved et bord i dag,
--      26900002 fem gange mad ud af huset.
select pg_temp.fyld('proev-bb3', 5, 'PRØVE-BB-1', '26900001');
select pg_temp.fyld('proev-bb3', 5, null, '26900002');

-- bb4: bord 1 har bestilt 20 gange i timen; bord 2 havde 20 for
--      61 minutter siden.
select pg_temp.fyld('proev-bb4', 20, 'PRØVE-BB-1');
select pg_temp.fyld('proev-bb4', 20, 'PRØVE-BB-2', null, now() - interval '61 minutes');

-- bb5: 20 fra bord 1 og 40 ud af huset i timen — alle i skraldespanden.
select pg_temp.fyld('proev-bb5', 20, 'PRØVE-BB-1');
select pg_temp.fyld('proev-bb5', 40);
update public.bestillinger set slettet = now() where lokation_id = 'proev-bb5';

alter table public.bestillinger enable trigger bestilling_bremse;


-- ------------------------------------------------------------
--  DE 40 I TIMEN
-- ------------------------------------------------------------
/* Tallet udefra: den gamle grænse står. Uden den linje kunne
   filen have fjernet bremsen helt, og resten ville bestå. */
select pg_temp.nej(1, 'Mad ud af huset: nr. 41 i timen afvises, som før',
  pg_temp.best('proev-bb1'), 'bestilling_bremse_travlt');

select pg_temp.ja(2, 'Et bord kan bestille, selv om der er 40 ud af huset i timen',
  pg_temp.best('proev-bb1', 'PRØVE-BB-1'));

select pg_temp.ja(3, '30 fra bordene + 39 ud af huset: nr. 40 ud af huset går igennem',
  pg_temp.best('proev-bb2'));

select pg_temp.nej(4, 'Men nr. 41 ud af huset afvises stadig',
  pg_temp.best('proev-bb2'), 'bestilling_bremse_travlt');


-- ------------------------------------------------------------
--  DE 5 PR. NUMMER
-- ------------------------------------------------------------
select pg_temp.nej(5, 'Mad ud af huset: 6. gang fra samme nummer på et døgn afvises, som før',
  pg_temp.best('proev-bb3', null, '26900002'), 'bestilling_bremse_nummer');

select pg_temp.ja(6, 'Fem runder ved bordet tæller ikke: samme nummer kan bestille ud af huset',
  pg_temp.best('proev-bb3', null, '26900001'));

select pg_temp.ja(7, 'Og et nummer med fem ud af huset kan stadig bestille ved bordet',
  pg_temp.best('proev-bb3', 'PRØVE-BB-2', '26900002'));


-- ------------------------------------------------------------
--  BORDETS EGET LOFT
-- ------------------------------------------------------------
/* Uden loftet var et bordnummer en dør uden om bremsen. */
select pg_temp.nej(8, 'Nr. 21 i timen fra samme bord afvises',
  pg_temp.best('proev-bb4', 'PRØVE-BB-1'), 'bestilling_bremse_bord');

select pg_temp.nej(9, 'Også skrevet med små bogstaver og mellemrum — det er samme bord',
  pg_temp.best('proev-bb4', ' prøve-bb-1 '), 'bestilling_bremse_bord');

select pg_temp.ja(10, 'Modstykke: bordet ved siden af kan bestille',
  pg_temp.best('proev-bb4', 'PRØVE-BB-2'));

/* bord 2 har 20 fra for 61 minutter siden og 1 fra prøve 10. */
select pg_temp.ja(11, 'Bestillinger fra for mere end en time siden tæller ikke',
  pg_temp.best('proev-bb4', 'PRØVE-BB-2'));



-- ------------------------------------------------------------
--  SKRALDESPANDEN (skraldespand.sql)
-- ------------------------------------------------------------
/* Første udgave af filen skrev funktionen forfra UDEN "slettet is
   null" — og så talte bremsen igen det, personalet havde slettet. */
select pg_temp.ja(13, 'Et bord med 20 slettede bestillinger kan bestille',
  pg_temp.best('proev-bb5', 'PRØVE-BB-1'));

select pg_temp.ja(14, '40 slettede ud af huset tæller ikke i timen',
  pg_temp.best('proev-bb5'));

select pg_temp.ja(12, 'Funktionen kører stadig som ejeren, med låst søgesti',
  (select case when p.prosecdef and p.proconfig @> array['search_path=""']
               then null else 'security definer eller search_path mangler' end
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'bestilling_bremse'));


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  case
    when (select count(*) from _svar) <> 14
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 14 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 14
    then 'ALLE 14 AF 14 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 14 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
