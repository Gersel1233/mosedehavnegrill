-- ============================================================
--  PRØVE AF DE SYV KORT  (1. september 2026)
--  ------------------------------------------------------------
--  Kør EFTER kortets-priser-3.sql. Hver prøve skriver BESTOD
--  eller FEJLEDE, og rapporten kommer til sidst som én "fejl" —
--  den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Et menukort fejler ikke med en fejlmeddelelse. Det fejler
--  ved, at en pris er forkert, eller at den samme ret står to
--  gange med hver sit tal — og det opdager ingen, før en gæst
--  har betalt.
--
--  ⚠️ TRE AF PRØVERNE MÅLER NOGET, DER IKKE KAN SES PÅ KORTET:
--    · at ingen vare fik en pris, ejeren ikke har oplyst
--      (prøve 12 tæller de prisløse og kræver, at de er PRÆCIS
--       de fire slags, vi ved hvorfor)
--    · at ingen af de otte overskrivninger blev glemt
--    · at dubletterne faktisk er væk
-- ============================================================

begin;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

-- Hvad koster varen i den kategori? null = findes ikke.
create or replace function pg_temp.pris(p_kat text, p_vare text)
returns numeric language sql stable as $$
  select m.pris from public.menu_varer m
    join public.menu_kategorier k on k.id = m.kategori_id
   where k.lokation_id = 'mosede' and k.navn = p_kat
     and lower(btrim(m.navn)) = lower(btrim(p_vare))
     and m.aktiv and k.aktiv
   limit 1;
$$;

create or replace function pg_temp.findes(p_kat text, p_vare text)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.menu_varer m
      join public.menu_kategorier k on k.id = m.kategori_id
     where k.lokation_id = 'mosede' and k.navn = p_kat
       and lower(btrim(m.navn)) = lower(btrim(p_vare)) and m.aktiv);
$$;

-- ------------------------------------------------------------
--  DE OTTE OVERSKRIVNINGER — de eneste linjer, der rørte et tal,
--  der allerede stod der. Bliver én af dem glemt, står gæsten
--  med en pris, ejeren har rettet.
-- ------------------------------------------------------------
select pg_temp.svar('1. Tartaren er 99 begge steder, ikke 95',
  pg_temp.pris('Smørrebrød', 'Tartar') = 99);

select pg_temp.svar('2. Platten er 179 — de 189 på grillkortet er forældede',
  pg_temp.pris('Platter', 'Platte til 1 person') = 179);

select pg_temp.svar('3. Vinflasken og den alkoholfri er 249',
  pg_temp.pris('Vin, cava og champagne', 'Vin, flaske') = 249
  and pg_temp.pris('Vin, cava og champagne', 'Alkoholfri vin, flaske') = 249);

select pg_temp.svar('4. Cava i glas er 69',
  pg_temp.pris('Vin, cava og champagne', 'Cava, glas') = 69);

select pg_temp.svar('5. RTD er 40, ikke 46',
  pg_temp.pris('Sodavand, juice og kakao', 'RTD') = 40);

/* ⚠️ DE TO HER ER FUNDET VED AT MÅLE, IKKE VED AT LÆSE.
   `kortets-priser-2.sql` rettede dem 30/8 — men pegede på
   `kategori_id` 13 og 17, som i en tom database er to HELT andre
   kategorier. Opdateringen ramte nul rækker og fejlede ikke.
   Prøven her er det, der siger til, hvis det sker igen. */
select pg_temp.svar('5b. Rejemaden er 85 og kaffe med pandekage 65',
  pg_temp.pris('Smørrebrød', 'Rejemad med mayo og citron') = 85
  and pg_temp.pris('Kaffe og varme drikke', 'Kaffe og pandekage') = 65);

-- ------------------------------------------------------------
--  CATERINGENS PRISER — ejerens egne tal fra svararket
-- ------------------------------------------------------------
select pg_temp.svar('6. Alle ti sliders koster 40',
  (select count(*) = 10 and count(*) filter (where m.pris = 40) = 10
     from public.menu_varer m join public.menu_kategorier k on k.id = m.kategori_id
    where k.navn = 'Sliders' and k.lokation_id = 'mosede' and m.aktiv));

select pg_temp.svar('7. Al pindemad koster 50',
  (select count(*) = 12 and count(*) filter (where m.pris = 50) = 12
     from public.menu_varer m join public.menu_kategorier k on k.id = m.kategori_id
    where k.navn = 'Reception og pindemad' and k.lokation_id = 'mosede' and m.aktiv));

select pg_temp.svar('8. Tapasfadet og brunchplatten har ejerens tal',
  pg_temp.pris('Tapasfad', 'Tapasfad') = 179
  and pg_temp.pris('Platter', 'Brunchplatte til 2 personer') = 349
  and pg_temp.pris('Morgenmad', 'Brunchtallerken') = 349);

select pg_temp.svar('9. Hele tilkøbet til morgenmaden er 10',
  (select bool_and(m.pris = 10)
     from public.menu_varer m join public.menu_kategorier k on k.id = m.kategori_id
    where k.navn = 'Tilkøb morgenmad' and k.lokation_id = 'mosede' and m.aktiv));

-- ------------------------------------------------------------
--  DUBLETTERNE — bekræftet af ejeren, slukket og ikke slettet
-- ------------------------------------------------------------
select pg_temp.svar('10. De fire bekræftede dubletter er slukket',
  not pg_temp.findes('Sandwich og retter fra pladen', 'Pølsemix')
  and not pg_temp.findes('Kugleis og ishorn', 'Thermobox')
  and not pg_temp.findes('Sodavand, juice og kakao', 'Bitter')
  and not pg_temp.findes('Softice og vafler', 'Belgisk vaffel'));

/* ⚠️ SLUKKET ER IKKE SLETTET. Rækken skal kunne tændes igen i
   admin — en fejlvurderet dublet må ikke koste ejeren en vare,
   han skal oprette forfra med beskrivelse og det hele. */
select pg_temp.svar('11. …men rækkerne findes STADIG (kan tændes igen)',
  (select count(*) = 4 from public.menu_varer m
     join public.menu_kategorier k on k.id = m.kategori_id
    where k.lokation_id = 'mosede' and not m.aktiv
      and m.navn in ('Pølsemix', 'Thermobox', 'Bitter', 'Belgisk vaffel')));

-- ------------------------------------------------------------
--  ⚠️ DEN VIGTIGSTE: INGEN VARE MÅ HAVE FÅET EN PRIS, VI HAR
--  FUNDET PÅ — og ingen må stå uden pris af en grund, vi ikke
--  kender. De prisløse skal være PRÆCIS fire slags.
-- ------------------------------------------------------------
select pg_temp.svar('12. Hver eneste vare uden pris har en kendt grund',
  (select count(*) = 0
     from public.menu_varer m join public.menu_kategorier k on k.id = m.kategori_id
    where k.lokation_id = 'mosede' and m.aktiv and k.aktiv and m.pris is null
      and k.navn not in ('Vælg fyld til smørrebrødet',
                         'Glutenfri, laktosefri og vegansk')
      and m.navn not like 'Isbar%'
      and m.navn <> 'Morgenbrød'));

/* Fyldet SKAL stadig være uden pris her: får det en pris, før
   smørrebrødet er bygget om, kan gæsten komme til at betale 55
   for smørrebrødet OG 55 for fyldet. */
select pg_temp.svar('13. Fyldlisten er stadig uden pris (venter på ombygningen)',
  (select bool_and(m.pris is null)
     from public.menu_varer m join public.menu_kategorier k on k.id = m.kategori_id
    where k.navn = 'Vælg fyld til smørrebrødet' and k.lokation_id = 'mosede'));

-- ------------------------------------------------------------
--  DUBLETVAGTEN — den fandt "Kage" på vej ind under to
--  overskrifter 24/8. Pris- og udsolgt-værnet dømmer på NAVNET,
--  så to rækker med samme navn er to priser for én ret.
-- ------------------------------------------------------------
select pg_temp.svar('14. Ingen NYE dubletter er kommet til',
  (select count(*) <= 2 from (
     select lower(btrim(m.navn))
       from public.menu_varer m join public.menu_kategorier k on k.id = m.kategori_id
      where k.lokation_id = 'mosede' and m.aktiv and k.aktiv
      group by 1 having count(*) > 1) d));

-- ------------------------------------------------------------
--  DE TOLV NYE VARER
-- ------------------------------------------------------------
select pg_temp.svar('15. De to slushice-størrelser står ved lugen',
  pg_temp.pris('Sodavand, juice og kakao', 'Slush Ice, lille') = 25
  and pg_temp.pris('Sodavand, juice og kakao', 'Slush Ice, stor') = 35);

select pg_temp.svar('16. Cateringens slushice har ejerens EGNE tal (20/25)',
  pg_temp.pris('Tilkøb ud af huset', 'Slushice, lille') = 20
  and pg_temp.pris('Tilkøb ud af huset', 'Slushice, stor') = 25
  and not pg_temp.findes('Tilkøb ud af huset', 'Slushice'));

select pg_temp.svar('17. De fire burgere fra svararket kan bestilles',
  pg_temp.pris('Burgere og sandwich', 'Bearnaiseburger') = 90
  and pg_temp.pris('Burgere og sandwich', 'Chilinaiseburger') = 90
  and pg_temp.pris('Burgere og sandwich', 'Flæskestegsburger') = 80
  and pg_temp.pris('Burgere og sandwich', 'Frikadelleburger') = 80);

select pg_temp.svar('18. Den store specialøl er kommet på kortet',
  pg_temp.pris('Øl', 'Specialøl, stor') = 70);

/* Ejerens eget ord er "SPØRG". En pris her ville være et tal, vi
   har fundet på — og siden svarer "Ring og hør prisen". */
select pg_temp.svar('19. Morgenbrødet står UDEN pris, som ejeren skrev',
  pg_temp.findes('Morgenmad', 'Morgenbrød')
  and pg_temp.pris('Morgenmad', 'Morgenbrød') is null);

/* "Alt efter type og størrelse af event" er ikke en pris. */
select pg_temp.svar('20. Isbaren står uden pris — den aftales',
  pg_temp.pris('Tilkøb ud af huset', 'Isbar med eller uden betjening') is null);

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

  raise exception E'\n======= RESULTATET AF DE SYV KORTS PRØVE =======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '===============================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 21 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
