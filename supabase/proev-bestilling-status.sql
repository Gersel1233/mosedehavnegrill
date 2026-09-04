-- ============================================================
--  PRØVE: KVITTERINGEN, DER LEVER  (4. september 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER bestilling-status.sql. Skriver
--  ingenting, der bliver stående: alt sker i en transaktion, der
--  rulles tilbage til sidst.
--
--  Skal skrive: ALLE 9 AF 9 BESTOD.
--
--  ⚠️ FORUDSÆTNINGEN SIGES MED ORD, IKKE MED EN RÅ FEJL. Sprang
--     man et trin over, ville filen ellers dø på en linje inde i
--     prøven, og man kunne ikke se, om den faldt eller aldrig kom
--     i gang. Læren fra proev-bordnummer.sql.
--
--  ⚠️ OG DEN LÅNER IKKE EJERENS DATA. Egen forretning, egne
--     telefonnumre, en vare, der med vilje ikke kan stå på
--     kortet, og en dag læst af åbningstiderne — ikke gættet.
--     Læren fra proev-bord-uden-telefon.sql, som faldt TRE gange
--     hos kunden, fordi den lånte ejerens dag, vare og borde.
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from pg_proc p
                  join pg_namespace ns on ns.oid = p.pronamespace
                 where ns.nspname = 'public'
                   and p.proname = 'mosede_bestilling_status') then
    raise exception 'KOER supabase/bestilling-status.sql FOERST — funktionen mosede_bestilling_status findes ikke, saa proeven her kan ikke maale noget.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text)
  on commit drop;

-- ⚠️ lokationer har tre not null-felter (setup.sql linje 101).
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-bst', 'Prøvehavnen', 'Prøvevej 1', '2670', 'Greve')
on conflict (id) do nothing;

/* ⚠️ EN BESTILLING HAR TRETTEN UDLØSERE PÅ SIG. Ni af dem kan
   sige nej til en helt almindelig række: lukkedagen, sæsonen,
   lukketiden, kategoriens dage, antallet på lager, prisen, det
   udsolgte, bremsen og dubletvagten.

   Prøven her handler om OPSLAGET, ikke om nogen af dem — så
   varen hedder noget, der med vilje ikke kan stå på et menukort
   (de tre navneværn rører aldrig et navn, de ikke kan finde), og
   forretningen er vores egen, så ejerens lukkedage og sæson ikke
   dømmer med. */
/* ⚠️ TELEFONEN SKAL VÆRE CIFRE, OG DET KOSTEDE FØRSTE KØRSEL.
   Nummeret blev bygget af referencen ('0000' || 'ST-0'), og
   `bestilling_telefon_ok` holder 8-15 CIFRE — så tre prøver faldt
   på et telefonnummer, filen slet ikke handler om. Nøjagtig arret
   fra proev-bord-uden-telefon.sql: en prøve, der ikke passer på
   sin egen opstilling, måler noget andet, end den tror.
   Nummeret er forskelligt pr. række, fordi `bestilling_bremse`
   holder fem pr. nummer pr. døgn. */
create or replace function pg_temp.best(
  ref text, st text, dage int default 0,
  slettet_den date default null, bord text default null,
  nr int default 1)
returns text language plpgsql as $$
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     antal, linjer, status, slettet, bord_nummer, hvordan)
  values
    (ref, 'proev-bst', 'Prøve Person', '2000' || lpad(nr::text, 4, '0'),
     current_date + dage, time '12:00', 2,
     '[{"navn":"PRØVE-VARE-UDEN-KORT","antal":2,"pris":50}]'::jsonb,
     st, slettet_den, bord,
     case when bord is null then 'afhentning' else 'spis_her' end);
  return null;
exception when others then
  return sqlerrm;
end $$;

-- Svaret læses som ÉN række; opslaget returnerer en tabel.
create or replace function pg_temp.slaaOp(ref text)
returns public.bestillinger.status%type
language sql as $$
  select status from public.mosede_bestilling_status(ref)
$$;

-- 1) Funktionen er security definer og låst søgesti
insert into _svar
select 1, 'funktionen er security definer med laast search_path',
  exists (select 1 from pg_proc p
           join pg_namespace ns on ns.oid = p.pronamespace
          where ns.nspname = 'public'
            and p.proname = 'mosede_bestilling_status'
            and p.prosecdef
            and array_to_string(p.proconfig, ',') like '%search_path=%'),
  null;

-- 2) En bestilling til i dag kan slås op paa sin reference
do $$
declare g text; s text;
begin
  g := pg_temp.best('PRV-ST-0001', 'ny', 0, null, null, 1);
  s := pg_temp.slaaOp('PRV-ST-0001');
  insert into _svar values (2, 'gaesten kan slaa sin egen bestilling op',
    s = 'ny', coalesce(g, 'svar: ' || coalesce(s, 'INTET')));
end $$;

-- 3) Og statussen FØLGER MED, naar koekkenet trykker videre.
--    ⚠️ Det er hele pointen med filen: uden det her er siden en
--    kvittering mere, ikke en side, der lever.
do $$
declare s text;
begin
  update public.bestillinger set status = 'klar'
   where reference = 'PRV-ST-0001';
  s := pg_temp.slaaOp('PRV-ST-0001');
  insert into _svar values (3, 'statussen foelger med, naar koekkenet trykker',
    s = 'klar', 'svar: ' || coalesce(s, 'INTET'));
end $$;

-- 4) ⚠️ ET AFVIST SVAR NAAR OGSAA FREM. Det er den vigtigste af
--    dem alle: kan koekkenet ikke lave maden, staar beskeden i
--    dag KUN paa personalets skaerm, og opkaldet er noget, nogen
--    skal huske.
do $$
declare s text;
begin
  update public.bestillinger set status = 'afvist'
   where reference = 'PRV-ST-0001';
  s := pg_temp.slaaOp('PRV-ST-0001');
  insert into _svar values (4, 'et afvist svar naar frem til gaesten',
    s = 'afvist', 'svar: ' || coalesce(s, 'INTET'));
end $$;

-- 5) ⚠️ NAVN, TELEFON OG ADRESSE KOMMER ALDRIG MED. Prøven
--    taeller KOLONNERNE i svaret — samme regel som optagne_dage,
--    arrangement_pladser og bord_fyldte_dage: en kolonne mere er
--    en oplysning, gaesten ikke skulle have haft.
insert into _svar
select 5, 'svaret har praecis de otte kolonner, det maa have',
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mosede_bestilling_status') = 0
  and (select count(*) = 8 and bool_and(a.attname in
        ('nummer','status','hent_dato','hent_tid','bord_nummer',
         'hvordan','antal','linjer'))
       from pg_proc p
       join pg_namespace ns on ns.oid = p.pronamespace
       join unnest(p.proargnames, p.proargmodes)
            with ordinality as u(nvn, modus, i) on true
       join lateral (select u.nvn as attname) a on true
      where ns.nspname = 'public'
        and p.proname = 'mosede_bestilling_status'
        and u.modus = 't'),
  null;

-- 6) En ukendt reference svarer INGENTING — ikke en tom raekke
--    med nuller, som gaesten kunne tro var hendes.
do $$
declare n int;
begin
  select count(*) into n from public.mosede_bestilling_status('FINDES-IKKE-XX');
  insert into _svar values (6, 'en ukendt reference svarer ingenting',
    n = 0, 'raekker: ' || n);
end $$;

-- 7) ⚠️ EN SLETTET RAEKKE SVARER INGENTING. Skraldespanden er en
--    dato i `slettet`; en bestilling, personalet har lagt vaek,
--    maa ikke blive ved med at kunne foelges.
/* ⚠️ OG DEN SKAL BESTAA AF DEN RIGTIGE GRUND. Første kørsel gav
   BESTOD her, mens indsættelsen var afvist af telefonværnet —
   opslaget fandt ingenting, fordi rækken aldrig kom ind. En
   prøve, der siger nej, fordi opstillingen fejlede, måler
   ingenting. Derfor kræves BÅDE at rækken FINDES, og at opslaget
   ikke svarer på den. */
do $$
declare g text; n int; findes boolean;
begin
  g := pg_temp.best('PRV-ST-0002', 'ny', 0, current_date, null, 2);
  select exists (select 1 from public.bestillinger
                  where reference = 'PRV-ST-0002') into findes;
  select count(*) into n from public.mosede_bestilling_status('PRV-ST-0002');
  insert into _svar values (7, 'en slettet bestilling kan ikke foelges',
    findes and n = 0,
    coalesce(g, case when findes then 'raekker: ' || n
                     else 'raekken blev aldrig oprettet' end));
end $$;

-- 8) ⚠️ OG VINDUET LUKKER. En reference, der bliver fundet om en
--    maaned, svarer ingenting. Dagen er hentedagen, ikke
--    oprettelsen: hun kan have bestilt fredag til soendag.
/* ⚠️ RÆKKEN SKUBBES BAGUD I TIDEN UDEN OM UDLØSEREN, præcis som
   proev-dato-vaern-resten.sql gør det. En bestilling kan ikke
   OPRETTES med en dato, der er gået — `bestilling_dato` afviser
   den, og første kørsel bestod derfor på en række, der aldrig kom
   ind. Udløseren slås fra for den ene opdatering og til igen med
   det samme. */
do $$
declare g text; n int; v_id bigint; skubbet boolean;
begin
  g := pg_temp.best('PRV-ST-0003', 'afhentet', 0, null, null, 3);
  select id into v_id from public.bestillinger where reference = 'PRV-ST-0003';
  if v_id is null then
    insert into _svar values (8, 'en gammel bestilling kan ikke foelges',
      false, coalesce(g, 'raekken blev aldrig oprettet'));
    return;
  end if;
  alter table public.bestillinger disable trigger bestilling_dato;
  update public.bestillinger set hent_dato = current_date - 3 where id = v_id;
  alter table public.bestillinger enable trigger bestilling_dato;

  select exists (select 1 from public.bestillinger
                  where id = v_id and hent_dato = current_date - 3) into skubbet;
  select count(*) into n from public.mosede_bestilling_status('PRV-ST-0003');
  insert into _svar values (8, 'en gammel bestilling kan ikke foelges',
    skubbet and n = 0,
    case when skubbet then 'raekker: ' || n
         else 'raekken blev ikke skubbet bagud' end);
end $$;

-- 9) ⚠️ MEN GAARSDAGENS KAN. Uden den her ville prøve 8 bestaa
--    paa et vindue, der var lukket helt — og gaesten, der henter
--    kl. 19.45 og kigger paa sin telefon kl. 00.10, ville staa
--    med en side, der sagde "vi kan ikke finde den".
do $$
declare g text; s text; v_id bigint;
begin
  g := pg_temp.best('PRV-ST-0004', 'afhentet', 0, null, null, 4);
  select id into v_id from public.bestillinger where reference = 'PRV-ST-0004';
  if v_id is null then
    insert into _svar values (9, 'gaarsdagens kan stadig foelges',
      false, coalesce(g, 'raekken blev aldrig oprettet'));
    return;
  end if;
  alter table public.bestillinger disable trigger bestilling_dato;
  update public.bestillinger set hent_dato = current_date - 1 where id = v_id;
  alter table public.bestillinger enable trigger bestilling_dato;

  s := pg_temp.slaaOp('PRV-ST-0004');
  insert into _svar values (9, 'gaarsdagens kan stadig foelges',
    s = 'afhentet', 'svar: ' || coalesce(s, 'INTET'));
end $$;

-- ------------------------------------------------------------
--  RAPPORT
-- ------------------------------------------------------------
/* ⚠️ EN NULL ER IKKE "BESTOD", OG DEN SKAL HELLER IKKE VÆRE
   USYNLIG. Første kørsel skrev "0 AF 9 FEJLEDE", mens fire
   prøver stod med FEJLEDE i tabellen ovenfor: sammenligningen
   `s = 'ny'` giver NULL, når opslaget ikke svarede, og
   `not bestod` er så også NULL — altså talte optællingen dem
   ikke med. En rapport, der siger nul fejl, mens der står fire,
   er værre end ingen rapport. coalesce lukker det begge steder. */
select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretning: proev-bst' as udgave,
  case
    when (select count(*) from _svar where coalesce(bestod, false)) = 9
    then 'ALLE 9 AF 9 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 9 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
