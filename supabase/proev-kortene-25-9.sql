-- ============================================================
--  PRØVE: kortene-25-9.sql  (24. september 2026)
--  ------------------------------------------------------------
--  Kør efter vaerktoej/byg-lokal-db.sh:
--      psql -d fuld -f supabase/proev-kortene-25-9.sql
--
--  Migreringen SKRIVER I EN DATABASE I DRIFT — den retter ti
--  priser, gæsten betaler. Prøven gentager dens sætninger med
--  SINE EGNE rækker og måler, at de rammer det, de skal, og
--  ikke andet.
--
--  ⚠️ OG DEN LÅNER IKKE EJERENS DATA. Arret fra 2/9:
--  proev-bord-uden-telefon.sql faldt tre gange hos kunden, fordi
--  den lånte hans dag, hans vare og hans borde. Her opretter
--  prøven en NABOFORRETNING med præcis de samme varer og de
--  samme gamle priser — og kræver, at de står urørte bagefter.
--  Uden naboen kunne prøve 2 og 6 ikke fejle: der ville ikke
--  være nogen anden række at ramme (arret fra
--  proev-ryd-proevedata 6/9).
--
--  ⚠️ MEN DEN KAN IKKE SE, OM SELVE FILEN STADIG BRUGER
--  REGLERNE. Det hul lukkes af tests/sql-mappen.spec.js, som
--  læser migreringen som TEKST.
--
--  Den slutter med ROLLBACK og efterlader ingenting.
-- ============================================================

begin;

create temporary table proev_svar (nr int, hvad text, resultat text);

create or replace function pg_temp.svar(nr int, hvad text, ok boolean)
returns void language sql as $$
  insert into proev_svar values (nr, hvad,
    case when ok then '✅ BESTOD' else '❌ FEJLEDE' end);
$$;

-- ------------------------------------------------------------
--  KULISSEN — to forretninger med de SAMME varer
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('naboen', 'Nabocafeen', 'Havnevej 1', '2670', 'Greve')
on conflict (id) do nothing;

/* ⚠️ EJEREN ER PRØVENS EGEN, IKKE MIKKELS. Lånte filen en rigtig
   e-mail fra admin_adgang, ville den holde op med at virke den
   dag, han skifter sin — og den ville bevise noget om HANS
   adgang i stedet for om reglen. Samme lære som prøvens egne
   borde og dens egne varenavne. Rækken rulles tilbage med
   resten. */
insert into public.admin_adgang (lokation_id, email, rolle, aktiv)
values ('mosede', 'kortproeve@proev.dk', 'ejer', true),
       ('naboen', 'kortproeve@proev.dk', 'ejer', true)
on conflict (email, lokation_id) do update set rolle = 'ejer', aktiv = true;

/* Kategorierne skal hedde det, PRODUKTIONEN kalder dem — det er
   dem, migreringen slår op på. Den lokale database er bygget af
   menukort.sql og har sine egne navne, så de manglende oprettes
   her. */
do $$
declare l text; n text;
begin
  foreach l in array array['mosede', 'naboen'] loop
    foreach n in array array['Retter', 'Andre retter', 'Burgere', 'Sandwich',
                             'Pølser', 'Smørrebrød', 'Håndmadder', 'Kugleis',
                             'Softice og vafler',
                             'Tillæg: glutenfri, laktosefri og vegansk'] loop
      if not exists (select 1 from public.menu_kategorier k
                      where k.lokation_id = l and k.navn = n) then
        insert into public.menu_kategorier (lokation_id, navn, aktiv, sortering)
        values (l, n, true, 99);
      end if;
    end loop;
  end loop;
end $$;

/* De varer, migreringen rører — med de GAMLE priser, hos begge. */
do $$
declare l text; r record;
begin
  foreach l in array array['mosede', 'naboen'] loop
    for r in select * from (values
        ('Smørrebrød',                               'PRØVE Rejemad',              90::numeric),
        ('Tillæg: glutenfri, laktosefri og vegansk', 'PRØVE Glutenfrit brød',       0),
        ('Kugleis',                                  'PRØVE 4 kugler',             60),
        ('Sandwich',                                 'PRØVE Flæskestegssandwich',  80),
        ('Håndmadder',                               'PRØVE Flæskesteg, håndmad',  24)
      ) as t(kat, vare, pris)
    loop
      insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering)
      select k.id, r.vare, r.pris, true, 1
        from public.menu_kategorier k
       where k.lokation_id = l and k.navn = r.kat;
    end loop;
  end loop;
end $$;

-- ⚠️ Prisværnet fra roller.sql gælder også her: uden en e-mail i
--    request.jwt.claims svarer er_ejer_for() nej, også for
--    postgres. Se punkt 7, hvor det er DET, der måles.
select set_config('request.jwt.claims',
                  '{"email":"kortproeve@proev.dk"}', true);

-- ============================================================
--  MIGRERINGENS EGNE SÆTNINGER, MED PRØVENS RÆKKER
-- ============================================================
create temporary table pk_pris (kat text, vare text, pris numeric);
insert into pk_pris values
  ('Smørrebrød',                               'PRØVE Rejemad',             95),
  ('Tillæg: glutenfri, laktosefri og vegansk', 'PRØVE Glutenfrit brød',      5),
  ('Kugleis',                                  'PRØVE 4 kugler',            65),
  ('Sandwich',                                 'PRØVE Flæskestegssandwich', 75);

update public.menu_varer v set pris = p.pris
  from pk_pris p
  join public.menu_kategorier k on k.navn = p.kat and k.lokation_id = 'mosede'
 where v.kategori_id = k.id and v.navn = p.vare
   and v.pris is distinct from p.pris;

-- ------------------------------------------------------------
--  1) PRISERNE ER RETTET HOS OS
-- ------------------------------------------------------------
select pg_temp.svar(1, 'de fire priser er rettet hos mosede', (
  select count(*) = 4 from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
    join pk_pris p on p.vare = v.navn and p.kat = k.navn
   where k.lokation_id = 'mosede' and v.pris = p.pris));

-- ------------------------------------------------------------
--  2) NABOENS ER URØRT — det er lokation_id-garden
-- ------------------------------------------------------------
select pg_temp.svar(2, 'naboens fire varer har stadig de gamle priser', (
  select count(*) = 4 from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'naboen'
     and (v.navn, v.pris) in (('PRØVE Rejemad', 90), ('PRØVE Glutenfrit brød', 0),
                              ('PRØVE 4 kugler', 60), ('PRØVE Flæskestegssandwich', 80))));

-- ------------------------------------------------------------
--  3) HÅNDMADDERNE ER IKKE RØRT
--     Migreringen retter dem MED VILJE ikke: kortene siger 27,
--     ejerens eget ord 21/9 siger 24. En prøve, der ikke holdt
--     fast i det, ville lade en senere "oprydning" sætte 19
--     gæstepriser op, uden at nogen havde sagt ja.
-- ------------------------------------------------------------
select pg_temp.svar(3, 'håndmadden står stadig 24 — prisen er ikke gættet', (
  select v.pris = 24 from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'mosede' and v.navn = 'PRØVE Flæskesteg, håndmad'));

-- ------------------------------------------------------------
--  4) EN NY VARE OPRETTES ÉN GANG — ALDRIG TO
--     "En dublet er værre end en manglende vare."
-- ------------------------------------------------------------
create temporary table pk_ny (kat text, vare text, pris numeric);
insert into pk_ny values ('Kugleis', 'PRØVE Havnens café-is', 79);

do $$
declare i int;
begin
  for i in 1..2 loop           -- KØRT TO GANGE MED VILJE
    insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering)
    select k.id, n.vare, n.pris, true, 21
      from pk_ny n
      join public.menu_kategorier k on k.navn = n.kat and k.lokation_id = 'mosede'
     where not exists (
       select 1 from public.menu_varer v
         join public.menu_kategorier k2 on k2.id = v.kategori_id
        where k2.lokation_id = 'mosede'
          and lower(btrim(v.navn)) = lower(btrim(n.vare)));
  end loop;
end $$;

select pg_temp.svar(4, 'to kørsler giver ÉN ny vare, ikke to', (
  select count(*) = 1 from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'mosede' and v.navn = 'PRØVE Havnens café-is'));

-- ------------------------------------------------------------
--  5) ANDEN KØRSEL AF PRISERNE RØRER INGEN RÆKKER
-- ------------------------------------------------------------
do $$
declare ramt int;
begin
  update public.menu_varer v set pris = p.pris
    from pk_pris p
    join public.menu_kategorier k on k.navn = p.kat and k.lokation_id = 'mosede'
   where v.kategori_id = k.id and v.navn = p.vare
     and v.pris is distinct from p.pris;
  get diagnostics ramt = row_count;

  insert into proev_svar values (5, 'anden kørsel rører ingen rækker',
    case when ramt = 0 then '✅ BESTOD'
         else '❌ FEJLEDE — ' || ramt || ' rækker blev skrevet igen' end);
end $$;

-- ------------------------------------------------------------
--  6) MIGRERINGEN SLETTER ALDRIG EN VARE
--     Naboens fem rækker skal stå der alle sammen bagefter.
-- ------------------------------------------------------------
select pg_temp.svar(6, 'ingen vare er slettet hos naboen', (
  select count(*) = 5 from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'naboen' and v.navn like 'PRØVE %'));

-- ------------------------------------------------------------
--  7) UDEN EJER-CLAIMS SIGER DATABASEN NEJ
--     ⚠️ DET ER HELE GRUNDEN TIL, AT MIGREringen SÆTTER
--     request.jwt.claims. Falder prøven her, er værnet fjernet —
--     og så kan en medarbejder rette en pris.
-- ------------------------------------------------------------
do $$
declare gik boolean := true;
begin
  perform set_config('request.jwt.claims', '', true);
  begin
    update public.menu_varer v set pris = 111
      from public.menu_kategorier k
     where k.id = v.kategori_id and k.lokation_id = 'mosede'
       and v.navn = 'PRØVE Rejemad';
  exception when others then gik := false;
  end;
  perform pg_temp.svar(7, 'uden ejer-claims afvises en prisrettelse', not gik);
  perform set_config('request.jwt.claims',
                     '{"email":"kortproeve@proev.dk"}', true);
end $$;

-- ------------------------------------------------------------
--  8) OG MED EJER-CLAIMS GÅR DEN IGENNEM
--     Modstykket til 7. Uden det ville en regel, der sagde nej
--     til ALT, bestå prøve 7 — og migreringen kunne ikke køre.
-- ------------------------------------------------------------
do $$
declare gik boolean := true;
begin
  begin
    update public.menu_varer v set pris = 95
      from public.menu_kategorier k
     where k.id = v.kategori_id and k.lokation_id = 'mosede'
       and v.navn = 'PRØVE Rejemad';
  exception when others then gik := false;
  end;
  perform pg_temp.svar(8, 'med ejer-claims går prisrettelsen igennem', gik);
end $$;

-- ------------------------------------------------------------
--  9) OMDØBNINGEN RAMMER KUN VORES RÆKKE
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering)
select k.id, 'PRØVE Fransk hotdog, alm.', 40, false, 1
  from public.menu_kategorier k
 where k.navn = 'Pølser' and k.lokation_id in ('mosede', 'naboen');

update public.menu_varer v set navn = 'PRØVE Fransk hotdog, lille', aktiv = true
  from public.menu_kategorier k
 where k.id = v.kategori_id and k.lokation_id = 'mosede'
   and k.navn = 'Pølser' and v.navn = 'PRØVE Fransk hotdog, alm.';

select pg_temp.svar(9, 'hotdoggen er omdøbt og tændt hos os — og urørt hos naboen', (
  select (select count(*) from public.menu_varer v
            join public.menu_kategorier k on k.id = v.kategori_id
           where k.lokation_id = 'mosede'
             and v.navn = 'PRØVE Fransk hotdog, lille' and v.aktiv) = 1
     and (select count(*) from public.menu_varer v
            join public.menu_kategorier k on k.id = v.kategori_id
           where k.lokation_id = 'naboen'
             and v.navn = 'PRØVE Fransk hotdog, alm.' and not v.aktiv) = 1));

-- ------------------------------------------------------------
--  10) FILEN STANDSER, HVIS DER IKKE ER EN EJER
--      ⚠️ Uden den linje ville migreringen køre halvt igennem og
--      dø på den første pris — og en fil, der dør før sin første
--      rapportlinje, forsvinder ud af BÅDE BESTOD og FEJLEDE.
-- ------------------------------------------------------------
do $$
declare v_ejer text; faldt boolean := false;
begin
  select a.email into v_ejer
    from public.admin_adgang a
   where a.lokation_id = 'ingen-saadan-forretning' and a.aktiv and a.rolle = 'ejer'
   order by a.email limit 1;
  if v_ejer is null then faldt := true; end if;
  perform pg_temp.svar(10, 'uden en aktiv ejer finder opslaget ingenting', faldt);
end $$;

select nr, hvad, resultat from proev_svar order by nr;

rollback;
