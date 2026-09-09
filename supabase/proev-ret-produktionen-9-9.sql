-- ============================================================
--  PRØVE: ret-produktionen-9-9.sql  (9. september 2026)
--  ------------------------------------------------------------
--  Kør efter vaerktoej/byg-lokal-db.sh:
--      psql -d fuld -f supabase/proev-ret-produktionen-9-9.sql
--
--  Filen SKRIVER I EN DATABASE I DRIFT, og det er den slags, der
--  skal bevises, før den køres. Prøven gentager migreringens
--  sætninger med SINE EGNE rækker og måler, at de rammer det,
--  de skal — og ikke andet.
--
--  ⚠️ OG DEN LÅNER IKKE EJERENS DATA. Det er arret fra 2/9:
--  proev-bord-uden-telefon.sql faldt tre gange hos kunden, fordi
--  den lånte hans dag, hans vare og hans borde. Her opretter
--  prøven en NABOFORRETNING med præcis de samme fejl i sig — og
--  kræver, at de står urørte bagefter. Uden den nabo kunne
--  prøve 2, 5 og 9 ikke fejle: der ville ikke være nogen anden
--  række at ramme (arret fra proev-ryd-proevedata 6/9).
--
--  ⚠️ MEN DEN KAN IKKE SE, OM SELVE FILEN STADIG BRUGER
--  REGLERNE. Det hul lukkes af tests/sql-mappen.spec.js, som
--  læser migreringen som TEKST og kræver lokation_id-garden på
--  hver opdatering. Samme deling som ryd-proevedata.sql.
--
--  Den slutter med ROLLBACK og efterlader ingenting.
-- ============================================================

begin;

create temporary table proev_svar (nr int, hvad text, resultat text);

-- ------------------------------------------------------------
--  KULISSEN
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('naboen', 'Nabocafeen', 'Havnevej 20L', '2670', 'Greve')
on conflict (id) do update set adresse = 'Havnevej 20L';

-- Forretningen selv sat tilbage til det gamle husnummer.
update public.lokationer set adresse = 'Havnevej 20L' where id = 'mosede';

-- To nyheder hos os: én med fejlene, én der er skrevet rigtigt.
insert into public.nyheder (lokation_id, titel, tekst, dato, aktiv)
values
  ('mosede', 'PRØVE fejlstavet',
   'her ebstiller i mad, forspørger på arregementer og catering',
   current_date, true),
  ('mosede', 'PRØVE korrekt',
   'her bestiller I mad, forespørger på arrangementer og catering',
   current_date, true),
  -- og naboens, med præcis de samme fejl i sig
  ('naboen', 'PRØVE nabo', 'her ebstiller i mad, forspørger på arregementer',
   current_date, true);

-- Prøverækken, en rigtig ret, og en «Bæ» MED pris.
insert into public.dagens_retter (lokation_id, dato, navn, pris, aktiv)
values
  ('mosede', current_date,     'Bæ',            null, true),
  ('mosede', current_date,     'Stegt flæsk',     95, true),
  ('mosede', current_date + 1, 'Bæ',              75, true),
  ('naboen', current_date,     'Bæ',            null, true);

-- Et arrangement med åben tilmelding og uden tid.
insert into public.kalender
  (lokation_id, type, dato, titel, offentlig, tilmelding, pladser,
   pris_tekst, start_kl, beskrivelse, kategori)
values ('mosede', 'arrangement', current_date + 8, 'PRØVE havne',
        true, true, 40, '145', null, null, null);

-- ============================================================
--  MIGRERINGENS EGNE SÆTNINGER — ordret som i filen
-- ============================================================
update public.lokationer
   set adresse = 'Havnevej 20I'
 where id = 'mosede'
   and adresse is distinct from 'Havnevej 20I';

update public.nyheder
   set tekst = replace(replace(replace(tekst,
         'ebstiller i',  'bestiller I'),
         'forspørger',   'forespørger'),
         'arregementer', 'arrangementer')
 where lokation_id = 'mosede'
   and (tekst like '%ebstiller%'
     or tekst like '%forspørger%'
     or tekst like '%arregementer%');

update public.dagens_retter
   set aktiv = false
 where lokation_id = 'mosede'
   and lower(btrim(navn)) = 'bæ'
   and pris is null
   and aktiv;

-- ------------------------------------------------------------
--  1) ADRESSEN ER RETTET
-- ------------------------------------------------------------
insert into proev_svar select 1, 'adressen er Havnevej 20I',
  case when (select adresse from public.lokationer where id = 'mosede')
            = 'Havnevej 20I'
       then '✅ BESTOD'
       else '❌ FEJLEDE — står som '
            || (select adresse from public.lokationer where id = 'mosede') end;

-- ------------------------------------------------------------
--  2) NABOENS ADRESSE ER URØRT
--
--  ⚠️ UDEN DEN HER kunne en opdatering uden lokation_id bestå
--  prøve 1 og samtidig skrive om på hver eneste forretning i
--  databasen. Det er hele grunden til, at naboen findes.
-- ------------------------------------------------------------
insert into proev_svar select 2, 'en anden forretnings adresse er urørt',
  case when (select adresse from public.lokationer where id = 'naboen')
            = 'Havnevej 20L'
       then '✅ BESTOD' else '❌ FEJLEDE — naboen blev rettet med' end;

-- ------------------------------------------------------------
--  3) DE TRE STAVEFEJL ER VÆK — og teksten er den, Mikkel skrev
-- ------------------------------------------------------------
insert into proev_svar select 3, 'nyhedens tre stavefejl er rettet',
  case when (select tekst from public.nyheder
              where lokation_id = 'mosede' and titel = 'PRØVE fejlstavet')
            = 'her bestiller I mad, forespørger på arrangementer og catering'
       then '✅ BESTOD'
       else '❌ FEJLEDE — står som: '
            || (select tekst from public.nyheder
                 where lokation_id = 'mosede' and titel = 'PRØVE fejlstavet') end;

-- ------------------------------------------------------------
--  4) EN NYHED UDEN FEJL ER URØRT
-- ------------------------------------------------------------
insert into proev_svar select 4, 'en korrekt nyhed er ikke rørt',
  case when (select tekst from public.nyheder
              where lokation_id = 'mosede' and titel = 'PRØVE korrekt')
            = 'her bestiller I mad, forespørger på arrangementer og catering'
       then '✅ BESTOD' else '❌ FEJLEDE' end;

-- ------------------------------------------------------------
--  5) NABOENS NYHED ER URØRT — også med de samme fejl i sig
-- ------------------------------------------------------------
insert into proev_svar select 5, 'en anden forretnings nyhed er urørt',
  case when (select tekst from public.nyheder where lokation_id = 'naboen')
            like '%ebstiller%'
       then '✅ BESTOD' else '❌ FEJLEDE — naboens nyhed blev rettet med' end;

-- ------------------------------------------------------------
--  6) PRØVERÆKKEN ER SKJULT
-- ------------------------------------------------------------
insert into proev_svar select 6, 'prøverækken «Bæ» er skjult',
  case when (select aktiv from public.dagens_retter
              where lokation_id = 'mosede' and navn = 'Bæ'
                and dato = current_date) = false
       then '✅ BESTOD' else '❌ FEJLEDE — den står stadig aktiv' end;

-- ------------------------------------------------------------
--  7) EN RIGTIG RET PÅ SAMME DAG ER URØRT
-- ------------------------------------------------------------
insert into proev_svar select 7, 'en rigtig ret samme dag er urørt',
  case when (select aktiv from public.dagens_retter
              where lokation_id = 'mosede' and navn = 'Stegt flæsk')
       then '✅ BESTOD' else '❌ FEJLEDE — dagens ret blev skjult med' end;

-- ------------------------------------------------------------
--  8) EN «Bæ» MED PRIS ER URØRT — prisen ER værnet
--
--  ⚠️ EN RET, KØKKENET MENER NOGET MED, HAR EN PRIS. Det er
--  reglen fra 7/9 ("jeg kan lægge en dagens ret uden pris, fix
--  det"), brugt som kending her: uden pris-garden ville filen
--  kunne skjule en ret, ejeren havde kaldt noget kort.
-- ------------------------------------------------------------
insert into proev_svar select 8, 'en «Bæ» MED pris er urørt',
  case when (select aktiv from public.dagens_retter
              where lokation_id = 'mosede' and navn = 'Bæ'
                and dato = current_date + 1)
       then '✅ BESTOD' else '❌ FEJLEDE — prisen beskyttede den ikke' end;

-- ------------------------------------------------------------
--  9) NABOENS «Bæ» ER URØRT
-- ------------------------------------------------------------
insert into proev_svar select 9, 'en anden forretnings prøverække er urørt',
  case when (select aktiv from public.dagens_retter where lokation_id = 'naboen')
       then '✅ BESTOD' else '❌ FEJLEDE — naboen blev ryddet med' end;

-- ------------------------------------------------------------
--  10) FILEN KAN KØRES IGEN — anden kørsel ændrer INGENTING
--
--  ⚠️ Uden den her kunne en opdatering uden sin
--  "is distinct from"-gard bestå alle prøverne ovenfor og
--  alligevel skrive på hver eneste række, hver gang nogen
--  trykker Run. Vi tæller de RAMTE rækker i anden kørsel.
-- ------------------------------------------------------------
do $$
declare ramt int; i_alt int := 0;
begin
  update public.lokationer set adresse = 'Havnevej 20I'
   where id = 'mosede' and adresse is distinct from 'Havnevej 20I';
  get diagnostics ramt = row_count; i_alt := i_alt + ramt;

  update public.nyheder
     set tekst = replace(replace(replace(tekst,
           'ebstiller i', 'bestiller I'), 'forspørger', 'forespørger'),
           'arregementer', 'arrangementer')
   where lokation_id = 'mosede'
     and (tekst like '%ebstiller%' or tekst like '%forspørger%'
       or tekst like '%arregementer%');
  get diagnostics ramt = row_count; i_alt := i_alt + ramt;

  update public.dagens_retter set aktiv = false
   where lokation_id = 'mosede' and lower(btrim(navn)) = 'bæ'
     and pris is null and aktiv;
  get diagnostics ramt = row_count; i_alt := i_alt + ramt;

  insert into proev_svar values (10, 'anden kørsel rører ingen rækker',
    case when i_alt = 0 then '✅ BESTOD'
         else '❌ FEJLEDE — ' || i_alt || ' rækker blev skrevet igen' end);
end $$;

-- ------------------------------------------------------------
--  11) RAPPORTEN PEGER PÅ ARRANGEMENTET, DER MANGLER NOGET
--
--  Filen retter det ikke — den skal SIGE det. En rapport, der
--  tier om den ene ting, ejeren skal afgøre, er en rapport,
--  ingen handler på.
-- ------------------------------------------------------------
insert into proev_svar select 11, 'rapporten nævner arrangementet uden tid',
  case when exists (
    select 1 from public.kalender
     where lokation_id = 'mosede' and type = 'arrangement'
       and offentlig and tilmelding and dato >= current_date
       and (start_kl is null or beskrivelse is null or kategori is null))
       then '✅ BESTOD' else '❌ FEJLEDE — rapportens udvælgelse fandt den ikke' end;

select nr, hvad, resultat from proev_svar order by nr;

rollback;
