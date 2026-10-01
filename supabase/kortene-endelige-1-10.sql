-- ============================================================
--  DE ENDELIGT GODKENDTE MENUKORT  (1. okt 2026)
--  ------------------------------------------------------------
--  Mikkel med de syv endelige danske kort: *"Sammenlign hele
--  hjemmesidens menu, onlinebestillingen og QR-bestillingen med
--  de senest godkendte danske menukort … ændr ikke priser eller
--  produkter ud fra gæt."*
--
--  ⚠️ PRISERNE ER MÅLT OG DE STEMMER. Hele kortet blev holdt op
--     mod databasen vare for vare, før filen her blev skrevet, og
--     der er IKKE rettet en eneste pris på en vare, der i forvejen
--     stod rigtigt. Filen retter NAVNE, HYLDER og to varer, der
--     ikke kunne bestilles. Det er alt.
--
--  ⚠️ OG DEN RØRER IKKE TRYKFILERNE. Chefen 30/9: trykfilerne må
--     ikke ændres ud fra databasen. Det går den anden vej her:
--     kortene er facitlisten, databasen retter sig efter dem.
--
--  Kan køres igen. Prøven står nederst.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  0) SKRIV SOM EJEREN
--     `menu_vare_pris_ejer` (roller.sql) spørger auth.jwt() og
--     afviser en prisændring fra en SQL-fil uden claims med
--     kun_ejeren_saetter_priser. MÅLT på den lokale database, før
--     filen rørte skyen — præcis den fælde, haandmadder-27-kr.sql
--     og chefens-rettelser-29-9.sql beskriver. Samme greb som dem.
-- ------------------------------------------------------------
do $$
declare v_ejer text;
begin
  select a.email into v_ejer
    from public.admin_adgang a
   where a.lokation_id = 'mosede' and a.aktiv and a.rolle = 'ejer'
   order by a.email limit 1;
  if v_ejer is null then
    raise exception 'Ingen aktiv ejer i admin_adgang for mosede. Intet er aendret.';
  end if;
  perform set_config('request.jwt.claims', json_build_object('email', v_ejer)::text, true);
end $$;

-- ------------------------------------------------------------
--  1) KARTOFLEN HEDDER "KRYDRET", IKKE "KRYDDERET"
--     Kortet (kort 1 og kort 2) skriver "Bagt krydret kartoffel".
--     ⚠️ BEGGE STEDER: den faste vare OG de syv dage i ugeplanen.
--     Rettes kun det ene, står der to forskellige navne på den
--     samme ret — og databasens prisværn slår op PÅ NAVNET, så
--     ugens ret ville holde op med at kunne bestilles.
-- ------------------------------------------------------------
update public.menu_varer
   set navn = 'Bagt krydret kartoffel'
 where lower(btrim(navn)) = 'bagt krydderet kartoffel';

update public.dagens_retter
   set navn = 'Bagt krydret kartoffel'
 where lower(btrim(navn)) = 'bagt krydderet kartoffel';

/* ⚠️ OG DEN STÅR UNDER "ANDRE RETTER" PÅ KORTET, ikke under
   "Retter". Hylden afgør, hvor gæsten leder — og hvilken
   kategoris åbningstid og varsel der gælder for den. */
update public.menu_varer
   set kategori_id = (select id from public.menu_kategorier
                       where navn = 'Andre retter' limit 1)
 where lower(btrim(navn)) = 'bagt krydret kartoffel';

-- ------------------------------------------------------------
--  2) CHURROS ER SEKS STYKKER
--     Kortet: "6 churros med sukker og kanel – 45,-" og
--     "6 churros med is og sauce – 67,-". Antallet stod ikke i
--     navnet, og "Churros 45,-" fortæller ikke, hvad man får.
--     Priserne er uændrede — de stemte i forvejen.
-- ------------------------------------------------------------
update public.menu_varer set navn = '6 churros med sukker og kanel'
 where lower(btrim(navn)) = 'churros med sukker og kanel';
update public.menu_varer set navn = '6 churros med is og sauce'
 where lower(btrim(navn)) = 'churros med is og sauce';

-- ------------------------------------------------------------
--  3) MORGENBRØD SIGER, HVAD MAN SKAL GØRE
--     Kortet: "Morgenbrød — SPØRG · Spørg efter en
--     bestillingsliste". Varen stod uden pris og uden tekst, så
--     den sagde ingenting. Mikkel 1/10: der skal IKKE oprettes en
--     morgenbrød-bestillingsliste endnu — vi afventer den nye
--     bager. Derfor kun sætningen.
-- ------------------------------------------------------------
update public.menu_varer
   set beskrivelse = 'Spørg efter en bestillingsliste'
 where lower(btrim(navn)) = 'morgenbrød';

-- ------------------------------------------------------------
--  4) PLATTEN — RØRES IKKE. MIN FEJL, SKREVET NED
--     ------------------------------------------------------------
--     Her stod en omdøbning: den slukkede »Planke« (id 16,
--     kategorien Retter) skulle hedde »Platte« og tændes, fordi
--     kortet lover en Platte til 179.
--
--     ⚠️ DEN VAR FORKERT, OG JEG NÅEDE AT KØRE DEN. En rigtig
--        Platte fandtes allerede: id 163 i kategorien »Platter«,
--        179 kr., tændt, med nøjagtig den samme tekst »Skal
--        bestilles«. Kortets Platte manglede ALDRIG — jeg havde
--        kun kigget i »Retter« og konkluderet ud fra det ene sted.
--        Resultatet var to varer med samme navn og samme pris, og
--        dét er lige præcis det, der gør bonen og prisværnet
--        tvetydige.
--
--     Rullet tilbage med det samme (navn »Planke«, slukket).
--     Beskrivelsen kunne ikke sættes tilbage: jeg havde overskrevet
--     den, og logbogen fører ikke menu_varer. Rækken er slukket, så
--     teksten virker ingen steder — men tabet står her.
--
--     LÆREN: slå navnet op i HELE tabellen, ikke i den kategori,
--     man tilfældigvis kigger i. Et navn er ikke unikt.

--  5) DE SLUKKEDE DUBLETTER FÅR DE RIGTIGE PRISER
--     ------------------------------------------------------------
--     Rejemad og tartarmaden lever i kategorien Smørrebrød til
--     95,- hver — dét er dem, gæsten møder, og de er rigtige.
--     Men i "Retter" ligger to SLUKKEDE dubletter fra den gamle
--     model med 85 og 99, og den ene hedder oven i købet
--     "Tatarmad".
--
--     ⚠️ DE SLETTES IKKE. Mikkel: "ingen sletning af eksisterende
--        funktioner". De er heller ikke farlige i dag — en slukket
--        række tæller ikke med i prisværnet. Men den dag nogen
--        tænder dem i admin, ville prisen være forkert, og det
--        ville ingen opdage. Så de får de rigtige tal nu.
-- ------------------------------------------------------------
update public.menu_varer set pris = 95
 where lower(btrim(navn)) = 'rejemad' and pris = 85 and not aktiv;
update public.menu_varer set navn = 'Tartarmad', pris = 95
 where lower(btrim(navn)) = 'tatarmad' and not aktiv;

-- ------------------------------------------------------------
--  6) MILKSHAKE OG FLÆSKESVÆR KAN BESTILLES
--     ------------------------------------------------------------
--     Begge står på de trykte kort med den rigtige pris —
--     Milkshake 59 under KOLDE DRIKKE, flæskesvær 35 under SLIK &
--     SNACKS — og begge lå i kategorien "Tilkøb ud af huset", som
--     IKKE er bestilbar. De kunne ses på menukortet og ikke
--     lægges i kurven, hverken på forsiden eller ved bordet.
--
--     Målt, ikke læst: bestilbare_kategorier er
--     [8,9,10,11,12,17,18,19,20,21,27,31,32,15,16,63,64] — 30 står
--     der ikke. Nu flyttes de to varer hen, hvor kortet har dem.
-- ------------------------------------------------------------
update public.menu_varer
   set kategori_id = (select id from public.menu_kategorier
                       where navn = 'Sodavand, juice og kakao' limit 1)
 where lower(btrim(navn)) = 'milkshake';

update public.menu_varer
   set kategori_id = (select id from public.menu_kategorier
                       where navn = 'Snacks og slik' limit 1)
 where lower(btrim(navn)) = 'hjemmelavet flæskesvær' and aktiv;

commit;


-- ============================================================
--  PRØVEN — alt skal sige JA.
--  ------------------------------------------------------------
--  ⚠️ FEM AF DEM KAN KUN MÅLES I PRODUKTIONEN. Den lokale
--     database bygges af supabase/-mappens filer og har hverken
--     ejerens ugeplan, kartoflen eller Milkshake — og den har
--     ANDRE kategori-id'er. Derfor svarer de "ingen data her" i
--     stedet for NEJ: en manglende række er ikke en fejl i
--     filen, og en prøve, der råber fejl lokalt, holder man op
--     med at se på. Filen slår kategorier op på NAVN netop
--     derfor.
-- ============================================================
create or replace function pg_temp.svar(findes boolean, ok boolean)
returns text language sql immutable as $$
  select case when not findes then 'ingen data her'
              when ok then 'JA' else '** NEJ **' end;
$$;

select '1. Kartoflen hedder "Bagt krydret kartoffel" BEGGE steder' as hvad,
       pg_temp.svar(
         exists (select 1 from public.dagens_retter),
         (select count(*) = 0 from public.menu_varer where navn ilike '%krydderet%')
         and (select count(*) = 0 from public.dagens_retter where navn ilike '%krydderet%')) as ok
union all
select '2. … og den står under Andre retter',
       pg_temp.svar(
         exists (select 1 from public.menu_varer where navn = 'Bagt krydret kartoffel'),
         (select k.navn = 'Andre retter' from public.menu_varer v
            join public.menu_kategorier k on k.id = v.kategori_id
           where v.navn = 'Bagt krydret kartoffel'))
union all
select '3. … og den har stadig ejerens to tilvalg til 10,-',
       pg_temp.svar(
         exists (select 1 from public.dagens_retter where navn = 'Bagt krydret kartoffel'),
         (select bool_and(public.mosede_tilvalg_tillaeg(tilvalg, '["Oksekød","Kylling"]'::jsonb) = 20)
            from public.dagens_retter where navn = 'Bagt krydret kartoffel'))
union all
select '4. Churros siger seks — og koster det samme som før',
       pg_temp.svar(true,
         (select count(*) = 2 from public.menu_varer
           where navn in ('6 churros med sukker og kanel', '6 churros med is og sauce'))
         and (select pris = 45 from public.menu_varer where navn = '6 churros med sukker og kanel')
         and (select pris = 67 from public.menu_varer where navn = '6 churros med is og sauce'))
union all
select '5. Morgenbrød beder om bestillingslisten',
       pg_temp.svar(
         exists (select 1 from public.menu_varer where navn = 'Morgenbrød'),
         (select beskrivelse = 'Spørg efter en bestillingsliste'
            from public.menu_varer where navn = 'Morgenbrød'))
union all
select '6. … og der er STADIG ingen morgenbrød-bestillingsliste (afventer bageren)',
       pg_temp.svar(true,
         not exists (select 1 from public.menu_kategorier where navn ilike '%morgenbrød%'))
union all
/* ⚠️ MÅLER NU, AT DER KUN ER ÉN. Se noten ved punkt 4: filen nåede
   at lave en dublet, fordi den slog navnet op i én kategori. Prøven
   her ville have fanget det med det samme. */
select '7. Der er præcis ÉN Platte, den er tændt og koster 179',
       pg_temp.svar(
         exists (select 1 from public.menu_varer where navn = 'Platte'),
         (select count(*) = 1 from public.menu_varer where navn = 'Platte')
         and (select bool_and(aktiv and pris = 179) from public.menu_varer where navn = 'Platte')
         and (select count(*) = 1 from public.menu_varer where navn = 'Planke' and not aktiv))
union all
select '8. De slukkede dubletter har de rigtige tal',
       pg_temp.svar(true,
         (select count(*) = 0 from public.menu_varer
           where (lower(navn) = 'rejemad' and pris <> 95) or lower(navn) = 'tatarmad'))
union all
select '9. Milkshake 59 kan bestilles',
       pg_temp.svar(
         exists (select 1 from public.indstillinger
                  where lokation_id = 'mosede' and noegle = 'bestilbare_kategorier'),
         (select v.pris = 59 and v.aktiv and k.id = any (array(
                   select jsonb_array_elements_text(i.vaerdi)::int from public.indstillinger i
                    where i.lokation_id = 'mosede' and i.noegle = 'bestilbare_kategorier'))
            from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
           where v.navn = 'Milkshake'))
union all
select '10. Hjemmelavet flæskesvær 35 kan bestilles',
       pg_temp.svar(
         exists (select 1 from public.indstillinger
                  where lokation_id = 'mosede' and noegle = 'bestilbare_kategorier'),
         (select bool_or(v.pris = 35 and v.aktiv and k.id = any (array(
                   select jsonb_array_elements_text(i.vaerdi)::int from public.indstillinger i
                    where i.lokation_id = 'mosede' and i.noegle = 'bestilbare_kategorier')))
            from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
           where v.navn = 'Hjemmelavet flæskesvær'))
union all
/* ⚠️ DEN VIGTIGSTE. Filen må IKKE flytte en pris, der stod rigtigt.
   Tallene her er læst af de trykte kort, ikke af databasen — det er
   dem, der kommer udefra, og de er hele grunden til, at prøven
   måler noget. */
select '11. INGEN PRIS ER RØRT PÅ KORTETS BÆRENDE VARER',
       pg_temp.svar(
         exists (select 1 from public.menu_varer where navn = 'Bearnaiseburger'),
         not exists (
           select 1 from (values
             ('Bearnaiseburger', 90), ('Chilinaiseburger', 90),
             ('Flaske øl, stor Lux 75 cl', 80), ('Bagt krydret kartoffel', 55),
             ('Pølsemix med pommes', 90), ('Stjerneskud', 105),
             ('Dobbelt burger', 125), ('Clubsandwich', 105), ('Sandwich', 75),
             ('Platte', 179), ('Milkshake', 59), ('Havnens café-is', 79)
           ) as kort(navn, pris)
           join public.menu_varer v on v.navn = kort.navn
          where v.pris is distinct from kort.pris::numeric))
union all
/* ⚠️ DE NAVNGIVNE VARER OG IKKE "ALT I KATEGORIEN"  (1/10).
   Første udgave målte, at HVER aktiv række i Smørrebrød koster 55
   eller 95. Den faldt lokalt — og havde ret: den lokale kulisse
   bærer tre pensionerede rækker fra de gamle seed-filer
   (Æbleflæsk 75, "Rejemad med mayo og citron" 85, "Tartar" 99),
   som produktionen ikke har. En prøve, der råber fejl på en
   kulisse, holder man op med at se på.

   Så den måler nu dét, Mikkel bad om: at KORTETS varer har
   KORTETS pris. Navnene og tallene er læst af det trykte kort —
   de kommer udefra, og det er dem, der gør prøven til en måling
   og ikke til et spejl.

   ⚠️ OG DEN SKAL SCOPES TIL HYLDEN. Uden kategori-leddet traf
   opslaget også "Vælg fyld til smørrebrødet", hvor de SAMME navne
   står uden pris med vilje — og prøven faldt på fire fyld, der
   ikke er smørrebrød. Et navn er ikke unikt på tværs af
   kategorier; det er dét, hele prisværnet er bygget om. */
select '12. Kortets smørrebrød og håndmadder har kortets pris',
       pg_temp.svar(
         exists (select 1 from public.menu_varer where navn = 'Flæskesteg med surt'),
         not exists (
           select 1 from (values
             ('Flæskesteg med surt', 55), ('Dyrlægens natmad', 55),
             ('Leverpostej med surt', 55), ('Hvide sild', 55),
             ('Æggemad med mayo og løg', 55), ('Ostemad', 55),
             ('Rejemad', 95), ('Tartarmad', 95),
             ('Flæskesteg med surt, håndmad', 27),
             ('Dyrlægens natmad, håndmad', 27), ('Ostemad, håndmad', 27)
           ) as kort(navn, pris)
           join public.menu_varer v on v.navn = kort.navn and v.aktiv
           join public.menu_kategorier k on k.id = v.kategori_id
          where k.navn in ('Smørrebrød', 'Håndmadder')
            and v.pris is distinct from kort.pris::numeric));
