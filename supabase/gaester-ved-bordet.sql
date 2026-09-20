-- ============================================================
--  HVOR MANGE SIDDER DER?  (20. sep 2026)
--  ------------------------------------------------------------
--  Mikkels ord: "måske man skal ind i QR-code-tingen angive hvor
--  mange siddende man er, så de ved det."
--
--  Og gennemgangen mod søsterprojektet bad om det samme fra den
--  anden ende: en advarsel i admin, når der kommer FLERE gæster,
--  end der er bestilt mad til — "4 pers. · mad til 2". Den
--  advarsel kan kun bygges, hvis nogen fortæller systemet tallet.
--  De to punkter er ét stykke arbejde.
--
--  ⚠️ FRIVILLIGT FELT. Mikkels valg, og det er det rigtige: huset
--     har siden 23/8 haft reglen om, at en bestilling ikke må
--     møde sten på vejen ("bestilt er bestilt"). Kolonnen er
--     derfor nullable, og ALT skal virke, når den er tom — både
--     siden, bonen og advarslen.
--
--  ⚠️ NAVNET ER antal_personer OG IKKE "gaester", selv om der
--     allerede står `antal` i tabellen. `antal` er antal RETTER
--     (summen af linjernes antal, se Butik.bestil). Navnet her er
--     det samme, som bordbestillinger og forespoergsler bruger om
--     nøjagtig det samme begreb — én, der leder efter "hvor mange
--     mennesker", skal kunne finde alle tre steder med én søgning.
--
--  Kan køres igen. Prøven er proev-gaester-ved-bordet.sql.
-- ============================================================
begin;

alter table public.bestillinger
  add column if not exists antal_personer integer;

comment on column public.bestillinger.antal_personer is
  'Hvor mange der sidder ved bordet — gæstens eget tal, frivilligt. Tom = ikke oplyst. ⚠️ IKKE det samme som `antal`, der er antal retter.';

/* ⚠️ ET TAL, INGEN HAR TASTET FORKERT. Feltet er frivilligt, men
   står der noget, skal det kunne bruges: nul personer er ingen
   bestilling, og halvfems ved ét bord er en tastefejl eller en
   konsol. Databasen skal afvise det samme, som siden afviser. */
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'bestilling_antal_personer_ok') then
    alter table public.bestillinger
      add constraint bestilling_antal_personer_ok check (
        antal_personer is null
        or (antal_personer >= 1 and antal_personer <= 60));
  end if;
end $$;

commit;

select 'kolonnen findes' as tjek,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'bestillinger'
                  and column_name = 'antal_personer') as ok
union all
select 'tom er tilladt (frivilligt felt)',
       (select is_nullable from information_schema.columns
         where table_schema = 'public' and table_name = 'bestillinger'
           and column_name = 'antal_personer') = 'YES'
union all
select 'et tal uden for skiven afvises',
       exists (select 1 from pg_constraint
                where conname = 'bestilling_antal_personer_ok');
