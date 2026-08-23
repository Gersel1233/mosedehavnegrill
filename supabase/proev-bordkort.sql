-- ============================================================
--  PRØVE AF BORDENE OG DERES VÆRN  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER bordkort.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og rapporten kommer til sidst som én "fejl" — det er
--  den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVAD DER MÅLES
--  ------------------------------------------------------------
--  Bordene er den ENESTE tabel i systemet, alle må læse. Det er
--  et valg: gæstens telefon skal kunne slå op, om bord 7 findes,
--  før hun får en formular. Så prøven skal vise BEGGE dele — at
--  hun må læse listen, og at hun ikke kan røre den.
--
--  Og værnet skal fælde det, der ellers ville lande i køkkenet:
--  en bestilling til et bord, der ikke findes.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-b', 'Forretning B', 'Vej 1', '2670', 'Greve', '11111111')
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

/* Én bestilling ind, og et ja/nej tilbage. Telefonnummeret er et
   argument, fordi bremsen tæller pr. nummer: fem prøver fra det
   samme nummer ville få nummer seks til at fejle af en grund,
   prøven ikke handler om. */
create or replace function pg_temp.proev_bord(
  p_bord text, p_hvordan text, p_tlf text, p_ref text)
returns boolean language plpgsql as $$
begin
  insert into public.bestillinger
    (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer)
  values ('proev-b', p_ref, 'Gæst', p_tlf, current_date, '12:00',
          '[{"navn":"Burger","antal":1,"pris":95}]'::jsonb, 1, p_hvordan, p_bord);
  return true;
exception when others then return false;
end $$;

-- =============== 1) BORDENE KAN OPRETTES ====================
insert into public.borde (lokation_id, nummer, pladser, placering, sortering)
values ('proev-b', '7', 4, 'ude', 10),
       ('proev-b', 'Terrassen 2', 6, 'ude', 20),
       ('proev-b', 'Lukket bord', 2, 'inde', 30);

select pg_temp.svar('1. Bordene kan oprettes',
  (select count(*) = 3 from public.borde where lokation_id = 'proev-b'));

-- =============== 2) TO BORDE MED SAMME NUMMER ===============
do $$
declare gik boolean := true;
begin
  begin
    insert into public.borde (lokation_id, nummer) values ('proev-b', '7');
  exception when others then gik := false;
  end;
  perform pg_temp.svar('2. To borde kan ikke hedde det samme', not gik);
end $$;

/* Den samme fejl med store bogstaver og et mellemrum til sidst.
   For alle andre end en database er "Bord 7" og "bord 7 " det
   samme bord — og to mærkater, der peger samme sted hen, er
   præcis dét, nøglen findes for at forhindre. */
do $$
declare gik boolean := true;
begin
  begin
    insert into public.borde (lokation_id, nummer) values ('proev-b', 'TERRASSEN 2 ');
  exception when others then gik := false;
  end;
  perform pg_temp.svar('3. Store bogstaver og mellemrum er det samme bord', not gik);
end $$;

-- =============== 4-5) VÆRNET OM BORDNUMMERET ================
select pg_temp.svar('4. En bestilling til bord 7 tages imod',
  pg_temp.proev_bord('7', 'spis_her', '20304050', 'SM-B-4'));

select pg_temp.svar('5. En bestilling til et bord, der ikke findes, afvises',
  not pg_temp.proev_bord('99', 'spis_her', '20304051', 'SM-B-5'));

-- =============== 6) ET BORD ER SPIS HER =====================
/* Et bordnummer på en afhentning er to ting på én gang: skal
   maden ud på bordet, eller ligge klar i lugen? */
select pg_temp.svar('6. Et bordnummer på en afhentning afvises',
  not pg_temp.proev_bord('7', 'afhentning', '20304052', 'SM-B-6'));

-- =============== 7) ET SLUKKET BORD =========================
update public.borde set aktiv = false
 where lokation_id = 'proev-b' and nummer = 'Lukket bord';

select pg_temp.svar('7. Et bord, personalet har slukket, kan der ikke bestilles til',
  not pg_temp.proev_bord('Lukket bord', 'spis_her', '20304053', 'SM-B-7'));

-- =============== 8) SPIS HER UDEN BORD ER STADIG I ORDEN ====
/* Man kan gå ind, bestille ved lugen og sætte sig. Værnet må
   ikke lukke den vej. */
select pg_temp.svar('8. Spis her uden bordnummer går stadig igennem',
  pg_temp.proev_bord(null, 'spis_her', '20304054', 'SM-B-8'));

-- =============== 9-11) GÆSTEN SELV ==========================
do $$
declare kan boolean;
begin
  set local role anon;
  select count(*) > 0 into kan from public.borde where lokation_id = 'proev-b';
  reset role;
  perform pg_temp.svar('9. Gæsten må læse bordlisten (ellers kan telefonen ikke slå bordet op)', kan);
end $$;

do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan, bord_nummer)
    values ('proev-b', 'SM-B-10', 'Gæst', '20304055', current_date, '12:30',
            '[{"navn":"Burger","antal":1,"pris":95}]'::jsonb, 1, 'spis_her', '7');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('10. Gæsten selv kan bestille til bord 7', gik);
end $$;

do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan, bord_nummer)
    values ('proev-b', 'SM-B-11', 'Gæst', '20304056', current_date, '12:30',
            '[{"navn":"Burger","antal":1,"pris":95}]'::jsonb, 1, 'spis_her', 'Parkeringspladsen');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('11. Gæsten kan ikke bestille til et bord, der ikke findes', not gik);
end $$;

-- =============== 12-13) GÆSTEN MÅ IKKE RØRE BORDENE =========
do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.borde (lokation_id, nummer) values ('proev-b', 'Gæstens eget bord');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('12. Gæsten kan ikke oprette et bord', not gik);
end $$;

/* TO MÅDER AT SIGE NEJ PÅ, og prøven skal tage imod begge.

   Gæsten har kun SELECT på tabellen, så en update bliver nægtet
   allerede ved døren og KASTER. Havde hun haft rettigheden,
   ville adgangsreglen i stedet lade den løbe igennem og ramme
   nul rækker. Prøvede vi kun det ene, ville prøven vælte den dag,
   rettighederne blev sat anderledes — og det ville ligne, at
   værnet var brudt, mens det var strammere end før. */
do $$
declare rørt int := 0; naegtet boolean := false;
begin
  set local role anon;
  begin
    update public.borde set nummer = 'Kapret'
     where lokation_id = 'proev-b' and nummer = '7';
    get diagnostics rørt = row_count;
  exception when others then naegtet := true;
  end;
  reset role;
  perform pg_temp.svar('13. Gæsten kan ikke omdøbe et bord', naegtet or rørt = 0);
end $$;

-- =============== 14) VÆRNET SER LISTEN MED EJERENS ØJNE ======
/* Den stille fejl, og den vender MODSAT lukkedagsværnets.

   Værnet spørger "findes bordet IKKE?" og afviser i så fald. Ser
   det tabellen med gæstens øjne, og er listen en dag lukket for
   hende, finder det ingen borde — og så afviser det hver eneste
   bestilling fra hvert eneste bord. Ikke et hul: en luge, der
   siger "vi kender ikke bord 7" til alle, mens bordet står lige
   der, og skiltet på det er trykt.

   Prøven lukker listen for gæsten og bestiller til et bord, der
   FINDES. Uden security definer skriver den FEJLEDE. */
create policy proev_stram_borde on public.borde
  as restrictive for select to anon, authenticated using (false);

do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan, bord_nummer)
    values ('proev-b', 'SM-B-14', 'Gæst', '20304057', current_date, '13:00',
            '[{"navn":"Burger","antal":1,"pris":95}]'::jsonb, 1, 'spis_her', '7');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar(
    '14. Bord 7 kan bestilles til, selv om bordlisten er lukket for gæsten', gik);
end $$;

drop policy proev_stram_borde on public.borde;

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

  raise exception E'\n============ RESULTATET AF BORDPRØVEN ======================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 14 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
