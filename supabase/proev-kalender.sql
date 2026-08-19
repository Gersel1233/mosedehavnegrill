-- ============================================================
--  PRØVE AF KALENDEREN  (fase 3)
--  ------------------------------------------------------------
--  Kør EFTER kalender.sql. Rapporten kommer til sidst som én
--  "fejl" — det er ikke en fejl i databasen, det er den ene
--  kanal, Supabases SQL Editor altid viser, og afbrydelsen er
--  samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Kalenderen har en anden slags adgang end resten af systemet,
--  og det er dér, den kan gå galt. Bestillinger og forespørgsler
--  må gæsten SKRIVE i og aldrig læse. Kalenderen er omvendt:
--  gæsten må LÆSE dele af den.
--
--  "Dele af" er hele pointen. En lukkedag skal kunne ses af alle
--  — den står på forsiden. Et arrangement, personalet har skrevet
--  til sig selv, må ikke. Forskellen er ÉN kolonne, og en fejl
--  dér lægger køkkenets interne noter på hjemmesiden uden at
--  ligne en fejl. Prøve 4 og 5 er derfor de vigtigste her.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES?
--  Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
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

-- Fire rækker, der dækker alle fire kombinationer af type og
-- offentlighed. Uden dem rammer prøverne nul rækker og består i
-- en tom database, hvor der slet ingen regel var.
insert into public.kalender (lokation_id, type, dato, titel, offentlig, lukker_kl)
values
  ('proev-a', 'lukkedag',       current_date + 10, 'Juleaften',        true,  null),
  ('proev-a', 'arrangement',    current_date + 20, 'Havnefest',        true,  null),
  ('proev-a', 'arrangement',    current_date + 25, 'Bent har ferie',   false, null),
  ('proev-a', 'tidlig_lukning', current_date + 30, 'Personalemøde',    false, '15:00'),
  ('proev-b', 'lukkedag',       current_date + 10, 'B holder lukket',  true,  null);

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

-- =============== 1) PERSONALET ==============================
set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

select pg_temp.svar(
  '1. Chef A ser hele sin egen kalender',
  (select count(*) = 4 from public.kalender where lokation_id = 'proev-a'));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, titel)
    values ('proev-a', 'arrangement', current_date + 40, 'Loppemarked');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('2. Chef A KAN lægge noget i sin egen kalender', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, titel)
    values ('proev-b', 'arrangement', current_date + 40, 'Kapret');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('3. Chef A kan ikke skrive i forretning B''s kalender', not gik);
end $$;

-- =============== 2) GÆSTEN — DEN VIGTIGE ====================
/* Her er hele forskellen fra resten af systemet. Gæsten må læse
   noget af kalenderen, og "noget af" er én kolonne fra at være
   "det hele". */
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar(
  '4. En gæst KAN se en lukkedag — den står på forsiden',
  (select count(*) = 1 from public.kalender
    where lokation_id = 'proev-a' and type = 'lukkedag'));

select pg_temp.svar(
  '5. En gæst kan IKKE se et internt arrangement',
  (select count(*) = 0 from public.kalender
    where titel = 'Bent har ferie'));

select pg_temp.svar(
  '6. En gæst KAN se et offentligt arrangement',
  (select count(*) = 1 from public.kalender where titel = 'Havnefest'));

/* En tidlig lukning er en driftsoplysning, ikke en hemmelighed:
   gæsten skal kunne se, at der lukkes kl. 15, uanset om nogen har
   husket at sætte et flueben. Derfor er den offentlig som
   lukkedagen — også selv om offentlig står til false. */
select pg_temp.svar(
  '7. En gæst KAN se en tidlig lukning, også uden flueben',
  (select count(*) = 1 from public.kalender
    where titel = 'Personalemøde' and lukker_kl is not null));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, titel)
    values ('proev-a', 'lukkedag', current_date + 50, 'Lukket af en gæst');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('8. En gæst kan ikke lukke butikken', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.kalender set titel = 'Rettet af en gæst' where type = 'lukkedag';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('9. En gæst kan ikke rette i kalenderen', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.kalender where type = 'lukkedag';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('10. En gæst kan ikke slette en lukkedag', not gik);
end $$;

-- =============== 3) REGLERNE PÅ RÆKKEN ======================
set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, titel)
    values ('proev-a', 'tidlig_lukning', current_date + 60, 'Uden klokkeslæt');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('11. En tidlig lukning UDEN klokkeslæt bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, titel, lukker_kl)
    values ('proev-a', 'lukkedag', current_date + 61, 'Lukket med klokkeslæt', '15:00');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('12. En lukkedag MED klokkeslæt bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, slut_dato, titel)
    values ('proev-a', 'lukkedag', current_date + 70, current_date + 60, 'Baglæns');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('13. En periode, der slutter før den begynder, bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, slut_dato, titel)
    values ('proev-a', 'lukkedag', current_date + 80, current_date + 94, 'Vinterlukket');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('14. En lukkeperiode over flere dage er ÉN række', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, titel)
    values ('proev-a', 'sommerfest', current_date + 95, 'Ukendt type');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('15. En type, der ikke findes, bliver afvist', not gik);
end $$;

-- =============== 4) DEN GAMLE TABEL FLYTTEDE MED ============
/* Migrationen er den farligste del af hele fasen: går den galt,
   forsvinder forretningens juleaften fra forsiden, og ingen
   opdager det før den 24. december.

   Prøven lægger derfor SELV en gammel lukkedag ind og kører den
   RIGTIGE flyttefunktion — ikke en kopi af den. Første udgave
   spurgte bare "har hver gammel lukkedag en række?" i en database
   uden gamle lukkedage: sandt, og fuldstændig tomt.

   reset role: en migration køres af den, der sidder i SQL
   Editor, altså som ejeren — ikke som en indlogget medarbejder. */
reset role;

insert into public.lukkedage (lokation_id, dato, aarsag, emoji)
values ('proev-a', current_date + 100, 'Grundlovsdag', '🇩🇰')
on conflict do nothing;

-- Én uden årsag: titlen er not null, så den skal få en erstatning
insert into public.lukkedage (lokation_id, dato, aarsag, emoji)
values ('proev-a', current_date + 101, null, null)
on conflict do nothing;

/* Kaldet står i en exception-blok, så en migration, der VÆLTER,
   bliver til en linje man kan læse i stedet for at rive hele
   prøven med sig. Uden den fik man en rå not-null-fejl fra
   Postgres og ingen rapport — fejlen blev fanget, men man kunne
   ikke se hvilken prøve der faldt. */
do $$
declare antal int := -1;
begin
  begin
    antal := public.kalender_flyt_lukkedage();
  exception when others then antal := -1;
  end;
  perform pg_temp.svar('16. Flytningen tager de gamle lukkedage med', antal = 2);
end $$;

select pg_temp.svar(
  '17. Årsagen bliver til kalenderens titel',
  (select count(*) = 1 from public.kalender
    where dato = current_date + 100 and titel = 'Grundlovsdag' and emoji = '🇩🇰'));

/* En lukkedag uden årsag må ikke forsvinde i migrationen, bare
   fordi titlen er not null. Den skal have en erstatning. */
select pg_temp.svar(
  '18. En lukkedag UDEN årsag får en titel i stedet for at ryge ud',
  (select count(*) = 1 from public.kalender
    where dato = current_date + 101 and titel = 'Lukket'));

/* Filen skal kunne køres igen. Anden gang må den ikke lave
   dubletter — og en dublet på en lukkedag er en dobbelt "Lukket i
   dag" på forsiden. */
do $$
declare antal int := -1;
begin
  begin
    antal := public.kalender_flyt_lukkedage();
  exception when others then antal := -1;
  end;
  perform pg_temp.svar('19. En ny kørsel flytter ingenting igen', antal = 0);
end $$;

set local role authenticated;

-- =============== 5) EN FREMMED ==============================
set local request.jwt.claims = '{"email":"ingen@fremmed.dk"}';

select pg_temp.svar(
  '20. En indlogget uden adgang ser kun det offentlige',
  (select count(*) = 0 from public.kalender where titel = 'Bent har ferie'));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.kalender (lokation_id, type, dato, titel)
    values ('proev-a', 'arrangement', current_date + 96, 'Fremmed');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('21. En fremmed kan ikke skrive i kalenderen', not gik);
end $$;

-- ------------------------------------------------------------
--  RAPPORTEN. Den standser med vilje kørslen, så resultatet kan
--  læses FØR tilbagerulningen — og afbrydelsen er samtidig det,
--  der rydder prøvens data væk igen.
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

  raise exception E'\n=============== RESULTATET AF KALENDER-PRØVEN ===============\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 21 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
