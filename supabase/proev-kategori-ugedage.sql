-- ============================================================
--  PRØVE: SORTIMENT PR. UGEDAG   (5. september 2026)
-- ============================================================
--  Kør EFTER kategori-ugedage.sql. Skriver 12 linjer; alle skal
--  sige BESTOD.
--
--  ⚠️ DEN SKRIVER INGENTING BLIVENDE. Alt sker i én transaktion,
--  der rulles tilbage til sidst.
--
--  ⚠️ OG DEN LÅNER IKKE EJERENS DATA. Prøven har sin EGEN
--  forretning og sine egne kategorinavne — arret fra
--  proev-bord-uden-telefon.sql, der faldt hos kunden tre gange,
--  fordi den brugte hans dag, hans vare og hans borde.
-- ============================================================

begin;

create temporary table proeve_svar (nr int, hvad text, ok boolean) on commit drop;

-- ⚠️ lokationer har adresse, postnr og by som NOT NULL
--    (setup.sql linje 101). En stub uden dem lod filen falde på
--    linje 19 hos kunden 30/8.
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proeve-ugedage', 'Prøveforretning', 'Prøvevej 1', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.menu_kategorier (lokation_id, navn, afdeling, dage, aktiv)
values ('proeve-ugedage', 'PRØVE Man-tors',  'mad', '1234', true),
       ('proeve-ugedage', 'PRØVE Weekend',   'mad', '67',   true),
       ('proeve-ugedage', 'PRØVE Kun fredag','mad', '5',    true),
       ('proeve-ugedage', 'PRØVE Alle',      'mad', 'alle', true);

-- Datoer med kendt ugedag i september 2026:
--   7. = mandag, 10. = torsdag, 11. = fredag, 12. = lørdag, 13. = søndag

-- 1-4: man-tors ('1234')
insert into proeve_svar values
 (1, 'Man-tors er åben mandag',
     public.mosede_kategori_paa_dagen('1234', date '2026-09-07')),
 (2, 'Man-tors er åben torsdag',
     public.mosede_kategori_paa_dagen('1234', date '2026-09-10')),
 (3, 'Man-tors er LUKKET fredag — det er hele pointen',
     not public.mosede_kategori_paa_dagen('1234', date '2026-09-11')),
 (4, 'Man-tors er LUKKET lørdag',
     not public.mosede_kategori_paa_dagen('1234', date '2026-09-12'));

-- 5-7: weekend som cifre ('67')
insert into proeve_svar values
 (5, 'Weekend-cifre er åben lørdag',
     public.mosede_kategori_paa_dagen('67', date '2026-09-12')),
 (6, 'Weekend-cifre er åben søndag',
     public.mosede_kategori_paa_dagen('67', date '2026-09-13')),
 (7, 'Weekend-cifre er lukket fredag',
     not public.mosede_kategori_paa_dagen('67', date '2026-09-11'));

-- 8-10: DE TRE GAMLE ORD VIRKER UÆNDRET.
--   ⚠️ Uden de her prøver kunne migreringen have brudt de rækker,
--   der står i produktionen i dag — og ingen ville opdage det,
--   før en gæst ikke kunne bestille en burger om tirsdagen.
insert into proeve_svar values
 (8, 'hverdage er stadig man-fre',
     public.mosede_kategori_paa_dagen('hverdage', date '2026-09-11')
     and not public.mosede_kategori_paa_dagen('hverdage', date '2026-09-12')),
 (9, 'weekend er stadig lør-søn',
     public.mosede_kategori_paa_dagen('weekend', date '2026-09-13')
     and not public.mosede_kategori_paa_dagen('weekend', date '2026-09-11')),
 (10, 'alle er stadig alle — også tom og null',
     public.mosede_kategori_paa_dagen('alle', date '2026-09-12')
     and public.mosede_kategori_paa_dagen(null, date '2026-09-12')
     and public.mosede_kategori_paa_dagen('', date '2026-09-12'));

-- 11: CHECK'ET AFVISER SLUDDER.
--   ⚠️ '4321' skal afvises: to skærme kunne læse en uordnet
--   streng forskelligt, og '11' ville være mandag talt to gange.
do $$
declare v_afvist boolean := false;
begin
  begin
    insert into public.menu_kategorier (lokation_id, navn, afdeling, dage, aktiv)
    values ('proeve-ugedage', 'PRØVE Ulovlig', 'mad', '4321', true);
  exception when check_violation then v_afvist := true;
  end;
  insert into proeve_svar values (11, 'Uordnede cifre afvises af CHECK''et', v_afvist);
end $$;

-- 12: EN TOM LISTE ER IKKE EN KATEGORI.
--   Ingen dage betyder "kan aldrig bestilles", og det er hvad
--   fluebenet `aktiv` er til. Ellers ville ejeren have slukket
--   kategorien uden at kunne se hvorfor.
do $$
declare v_afvist boolean := false;
begin
  begin
    insert into public.menu_kategorier (lokation_id, navn, afdeling, dage, aktiv)
    values ('proeve-ugedage', 'PRØVE Ingen dage', 'mad', '', true);
  exception when check_violation then v_afvist := true;
  end;
  insert into proeve_svar values (12, 'En tom dagliste afvises', v_afvist);
end $$;


-- ============================================================
--  RAPPORT
-- ============================================================
select nr,
       case when ok then '✅ BESTOD' else '❌ FEJLEDE' end as svar,
       hvad
from proeve_svar order by nr;

select case when count(*) filter (where not ok) = 0
            then '✅ ALLE ' || count(*) || ' AF ' || count(*) || ' BESTOD'
            else '❌ ' || count(*) filter (where not ok) || ' AF ' || count(*) || ' FEJLEDE'
       end as facit
from proeve_svar;

rollback;
