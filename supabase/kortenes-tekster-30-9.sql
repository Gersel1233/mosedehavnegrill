-- ============================================================
--  KORTENES TEKSTER 30/9 — NAVNE, BESKRIVELSER OG ÉN PLACERING
-- ============================================================
--  Slutrapporten 30/9 holdt hjemmesiden op mod de endelige trykte
--  kort (Mosede Havnecafe - Alt 2). Priserne stemte; fire tekst-
--  forskelle blev godkendt af Mikkel:
--    1) Sandwichens beskrivelse som kort 02 (dagens pålægssalat og
--       henvisningen til bestillingslisten)
--    2) Isboksen: ÉN beskrivelse på side og kort, og BEGGE valg står
--       i den (6 valgfrie kugler ELLER softice). Navnet røres ikke —
--       isbyggeren læser "eller softice" og "6 kugler" af navnet
--    3) Navne som kortene: Ekstra kød eller tilbehør, Løs vaffel
--       pr. stk., Peanuts, cacao, Lumumba varm eller kold
--    4) Alkoholfri øl sidst i Øl
--
--  ⚠️ INGEN PRIS ÆNDRES OG INGEN RÆKKE OPRETTES. Matcher på navn,
--  kun det GAMLE navn, så filen kan køres igen.
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

create or replace function pg_temp.ret(gammel text, nyt_navn text, ny_beskrivelse text default null, slet_beskrivelse boolean default false)
returns void language sql as $$
  update public.menu_varer mv
     set navn = coalesce(nyt_navn, mv.navn),
         beskrivelse = case when slet_beskrivelse then null else coalesce(ny_beskrivelse, mv.beskrivelse) end
    from public.menu_kategorier mk
   where mk.id = mv.kategori_id
     and mk.lokation_id = 'mosede'
     and btrim(mv.navn) = gammel;
$$;

-- 1) Sandwich
select pg_temp.ret('Sandwich', null,
  'Kebab, kylling/bacon, tun, frikadelle, æg, flæskesteg, roastbeef, dagens pålægssalat m.fl. — se bestillingslisten for hele udvalget');

-- 2) Isboksen — begge valg i teksten
select pg_temp.ret('Isboks, ca. 6 kugler eller softice', null,
  'Tag med på turen – 6 valgfrie kugler eller softice');

-- 3) Navne som kortene
select pg_temp.ret('Ekstra tilbehør', 'Ekstra kød eller tilbehør');
select pg_temp.ret('Løs vaffel', 'Løs vaffel, pr. stk.');
select pg_temp.ret('Løs vaffel, glutenfri', 'Løs vaffel, glutenfri, pr. stk.');
select pg_temp.ret('Peanuts, 1 pose', 'Peanuts');
select pg_temp.ret('Sodavand, juice, iste eller kakao – lille', 'Sodavand, juice, iste eller cacao – lille');
select pg_temp.ret('Sodavand, juice, iste eller kakao – stor', 'Sodavand, juice, iste eller cacao – stor');
select pg_temp.ret('Lumumba', 'Lumumba, varm eller kold', null, true);

-- 4) Alkoholfri øl sidst i Øl (kun hvis den ikke allerede er det)
update public.menu_varer mv
   set sortering = (select max(x.sortering) + 1 from public.menu_varer x where x.kategori_id = mv.kategori_id)
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and btrim(mk.navn) in ('Øl', 'øl')
   and btrim(mv.navn) = 'Alkoholfri øl'
   and mv.sortering < (select max(x.sortering) from public.menu_varer x
                        where x.kategori_id = mv.kategori_id and x.id <> mv.id);

commit;

-- RAPPORT — hver kolonne skal stå, som navnet siger.
with v as (
  select mv.*, mk.navn as kat from public.menu_varer mv
    join public.menu_kategorier mk on mk.id = mv.kategori_id
   where mk.lokation_id = 'mosede')
select
  (select count(*) from v where navn in ('Ekstra tilbehør','Løs vaffel','Løs vaffel, glutenfri','Peanuts, 1 pose',
     'Sodavand, juice, iste eller kakao – lille','Sodavand, juice, iste eller kakao – stor','Lumumba'))
                                                                       as gamle_navn_skal_vaere_0,
  (select beskrivelse like '%dagens pålægssalat%bestillingslisten%' from v where kat = 'Sandwich' and navn = 'Sandwich')
                                                                       as sandwich_tekst_skal_vaere_true,
  (select beskrivelse from v where navn = 'Isboks, ca. 6 kugler eller softice')
                                                                       as isboks_med_softice,
  (select navn from v where btrim(kat) in ('Øl','øl') and aktiv order by sortering desc limit 1)
                                                                       as sidste_oel_skal_vaere_alkoholfri;
