-- ============================================================
--  PRØVE AF LOGBOGEN
--  ------------------------------------------------------------
--  Kør EFTER logbog.sql. Hver prøve skriver BESTOD eller FEJLEDE,
--  og hele rapporten kommer til sidst som én "fejl" — det er den
--  ene kanal, Supabases SQL Editor altid viser, og afbrydelsen er
--  samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  En logbog kan fejle på to modsatte måder, og begge er stille.
--
--  Den kan skrive FOR LIDT: trigger'en sidder ikke på alle fire
--  tabeller, eller den springer den ene ændring over, nogen
--  faktisk leder efter. Så er svaret på "hvem gjorde det" bare
--  tomt, og det ligner, at der ikke skete noget.
--
--  Og den kan skrive FOR MEGET: gemmer den hele rækken hver gang,
--  er den blevet en skyggekopi af kundernes navne og numre ved
--  siden af den, adgangsreglerne passer på. Halvdelen af prøverne
--  herunder handler om dét.
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-a', 'Forretning A', 'Vej 1', '2670', 'Greve', '11111111'),
       ('proev-b', 'Forretning B', 'Vej 2', '4600', 'Køge', '22222222')
on conflict (id) do nothing;

insert into public.admin_adgang (email, lokation_id) values
  ('chef-a@proev.dk', 'proev-a'),
  ('chef-b@proev.dk', 'proev-b')
on conflict do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

-- =============== GÆSTEN SENDER ==============================
set local role anon;
set local request.jwt.claims = '{}';

insert into public.bestillinger
  (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal, besked)
values ('proev-a', 'LOG-1', 'Anna', '11112222', current_date + 2, '12:00',
        '[{"navn":"Rejemad","antal":2,"pris":65}]'::jsonb, 2,
        'Må gerne være uden citron');

/* En oprettelse er sin egen række: navn, telefon og tidspunkt
   ligger der allerede. En logbogslinje oveni ville være den samme
   oplysning gemt to gange — og altså dobbelt så mange steder, hvor
   en gæsts nummer står. */
set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

select pg_temp.svar(
  '1. En oprettelse giver INGEN linje i logbogen',
  (select count(*) = 0 from public.logbog));

-- =============== EN RETTELSE ================================
/* clock_timestamp() og ikke now(). now() er transaktionens
   starttidspunkt og giver den SAMME værdi hele filen igennem — så
   ville aendret slet ikke være ændret, og prøve 5 og 6 ville bestå
   uden at måle noget. Det tog en fejlindsprøjtning at opdage. */
update public.bestillinger
   set status = 'bekraeftet', aendret = clock_timestamp()
 where reference = 'LOG-1';

select pg_temp.svar(
  '2. En rettelse giver præcis én linje',
  (select count(*) = 1 from public.logbog where reference = 'LOG-1'));

select pg_temp.svar(
  '3. Linjen siger HVEM der gjorde det',
  (select hvem = 'chef-a@proev.dk' from public.logbog
    where reference = 'LOG-1' order by id desc limit 1));

select pg_temp.svar(
  '4. Linjen siger HVAD der skete',
  (select hvad = 'rettet' from public.logbog
    where reference = 'LOG-1' order by id desc limit 1));

/* Kun det, der blev anderledes. Gemte den hele rækken, ville
   logbogen være en kopi af kundelisten ved siden af den, som
   adgangsreglerne passer på. */
select pg_temp.svar(
  '5. Kun det ÆNDREDE felt står i foer og efter',
  (select efter = '{"status": "bekraeftet"}'::jsonb
      and foer = '{"status": "ny"}'::jsonb
     from public.logbog where reference = 'LOG-1' order by id desc limit 1));

/* aendret ændrer sig ved hver eneste skrivning og fortæller
   ingenting. Stod den i logbogen, ville hver linje se ud som en
   ændring, uanset hvad der skete. */
select pg_temp.svar(
  '6. aendret står IKKE i logbogen',
  (select not (efter ? 'aendret') from public.logbog
    where reference = 'LOG-1' order by id desc limit 1));

/* Gæstens egne ord og hele bestillingen hører til i tabellen,
   ikke i logbogen. */
update public.bestillinger
   set linjer = '[{"navn":"Rejemad","antal":3,"pris":65}]'::jsonb,
       besked = 'Alligevel med citron'
 where reference = 'LOG-1';

select pg_temp.svar(
  '7. Hverken linjer eller besked ender i logbogen',
  (select count(*) = 0 from public.logbog
    where reference = 'LOG-1' and (efter ? 'linjer' or efter ? 'besked')));

-- En skrivning, der ikke ændrer noget, er ikke en hændelse.
do $$
declare foer_antal int;
begin
  select count(*) into foer_antal from public.logbog;
  update public.bestillinger set aendret = clock_timestamp() where reference = 'LOG-1';
  perform pg_temp.svar('8. En skrivning uden ændring giver ingen linje',
    (select count(*) from public.logbog) = foer_antal);
end $$;

-- =============== SKRALDESPANDEN HAR SIT EGET ORD ============
update public.bestillinger set slettet = now() where reference = 'LOG-1';

select pg_temp.svar(
  '9. En tur i skraldespanden hedder "i skraldespanden"',
  (select hvad = 'i skraldespanden' from public.logbog
    where reference = 'LOG-1' order by id desc limit 1));

update public.bestillinger set slettet = null where reference = 'LOG-1';

select pg_temp.svar(
  '10. Og tilbage igen hedder "hentet tilbage"',
  (select hvad = 'hentet tilbage' from public.logbog
    where reference = 'LOG-1' order by id desc limit 1));

-- =============== OG SLETNINGEN OVERLEVER RÆKKEN =============
delete from public.bestillinger where reference = 'LOG-1';

select pg_temp.svar(
  '11. Linjen om sletningen bliver stående, når rækken er væk',
  (select count(*) = 1 from public.logbog
    where reference = 'LOG-1' and hvad = 'slettet for altid'));

-- =============== ALLE FIRE TABELLER SKRIVER =================
insert into public.forespoergsler (lokation_id, reference, type, navn, telefon)
values ('proev-a', 'LOG-F1', 'catering', 'Fie', '13334444');
insert into public.bordbestillinger
  (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
values ('proev-a', 'LOG-B1', 'Bo', '15556666', current_date + 3, '18:00', 4);
insert into public.udlejninger
  (lokation_id, reference, navn, telefon, dato, antal_personer)
values ('proev-a', 'LOG-U1', 'Ulla', '17778888', current_date + 20, 30);

update public.forespoergsler   set status = 'kontaktet'  where reference = 'LOG-F1';
update public.bordbestillinger set status = 'bekraeftet' where reference = 'LOG-B1';
update public.udlejninger      set status = 'bekraeftet' where reference = 'LOG-U1';

select pg_temp.svar(
  '12. Alle fire tabeller skriver i logbogen',
  (select count(distinct tabel) = 4 from public.logbog));

-- =============== LOGBOGEN KAN IKKE RETTES ===================
/* En logbog, man kan skrive i, svarer ikke længere på det
   spørgsmål, den findes for. Der er ingen insert- og ingen
   update-regel — heller ikke for chefen. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.logbog (lokation_id, tabel, raekke_id, hvad, hvem)
    values ('proev-a', 'bestillinger', 999, 'rettet', 'en-anden@proev.dk');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('13. Chef A kan ikke SKRIVE en linje selv', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.logbog set hvem = 'en-anden@proev.dk';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('14. Chef A kan ikke rette en linje, der står der', not gik);
end $$;

-- Men gamle linjer skal kunne ryddes — se punkt 4 i logbog.sql.
do $$
declare gik boolean := false;
begin
  begin
    delete from public.logbog where reference = 'LOG-F1';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('15. Chef A KAN rydde gamle linjer', gik);
end $$;

-- =============== OG DEN ER IKKE ALLES =======================
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar(
  '16. En gæst kan ikke læse logbogen',
  (select count(*) = 0 from public.logbog));

do $$
declare gik boolean := false;
begin
  begin
    delete from public.logbog;
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('17. En gæst kan ikke rydde logbogen', not gik);
end $$;

set local role authenticated;
set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';

select pg_temp.svar(
  '18. Chef B ser ikke forretning A''s logbog',
  (select count(*) = 0 from public.logbog where lokation_id = 'proev-a'));

/* De TO regler passer på den her i fællesskab, og det er værd at
   vide: en delete med et where-led kræver også læseadgang for at
   kunne finde rækkerne. Chef B ville altså få nul ryddet, selv hvis
   slettereglen stod åben — men kun så længe læsereglen holder. */
do $$
declare gik boolean := false;
begin
  begin
    delete from public.logbog where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('19. Chef B kan ikke rydde forretning A''s logbog', not gik);
end $$;

-- ------------------------------------------------------------
--  RAPPORTEN — afbrydelsen ER oprydningen.
-- ------------------------------------------------------------
do $$
declare
  rapport text := rtrim(coalesce(current_setting('proev.rapport', true), ''), E'\n');
  linjer  text[] := case when rapport = '' then '{}'::text[]
                         else string_to_array(rapport, E'\n') end;
  antal   int := coalesce(array_length(linjer, 1), 0);
  fejl    int;
begin
  select count(*) into fejl from unnest(linjer) as l where l like 'FEJLEDE%';

  raise exception E'\n=========== RESULTATET AF LOGBOGS-PRØVEN ==================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 19 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

-- Kun for psql: lukker den afbrudte transaktion pænt.
rollback;
