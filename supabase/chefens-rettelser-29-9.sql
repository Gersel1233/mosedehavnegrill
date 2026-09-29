-- ============================================================
--  CHEFENS RETTELSER 29/9 — TRE VARER OG ÉN VARIANT
-- ============================================================
--  Chefens besked 29/9 (ordret, hjemmesidens del):
--
--    *"Menukort — Mangler vores bearnaise burger 90,-
--      Chilinaise burger 90,-
--      Flaske øl, Stor Lux 75 Cl. 80,-kr.
--      Sandwish - Dagens pålægs salat."*
--
--  Filen gør præcis det:
--    1) Bearnaiseburger og Chilinaiseburger TÆNDES igen (de blev
--       slukket 25/9 i sluk-det-kortene-ikke-viser.sql, fordi kortene
--       dengang ikke havde dem). Prisen er i forvejen 90 og røres ikke.
--    2) "Flaske øl, stor Lux 75 cl" oprettes under Øl til 80 kr.
--    3) Sandwichen får varianten "Dagens pålægssalat" (15 varianter;
--       loftet er 16, kortenes-rettelser-27-9.sql).
--
--  ⚠️ MATCHER PÅ NAVN, ALDRIG PÅ ID, og kan køres igen.
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- 0) Skriv som ejeren: den nye øl har en pris (se haandmadder-27-kr.sql).
do $$
declare v_ejer text;
begin
  select a.email into v_ejer
    from public.admin_adgang a
   where a.lokation_id = 'mosede' and a.aktiv and a.rolle = 'ejer'
   order by a.email limit 1;
  if v_ejer is null then
    raise exception 'Ingen aktiv ejer i admin_adgang for mosede. Opret ejeren under admin -> Personale foerst. Intet er aendret.';
  end if;
  perform set_config('request.jwt.claims', json_build_object('email', v_ejer)::text, true);
end $$;

-- 1) De to burgere tændes — prisen (90) står der i forvejen
update public.menu_varer mv
   set aktiv = true
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = 'burgere'
   and lower(btrim(mv.navn)) in ('bearnaiseburger', 'chilinaiseburger')
   and not mv.aktiv;

-- 2) Flaske øl, stor Lux 75 cl — 80 kr., lige efter Gylden Dame / Lux
--    Varerne efter Gylden Dame skubbes én plads ned, så den nye ikke deler
--    plads med "Alkoholfri øl" (set på et skud 29/9). Kun når den oprettes.
do $$
declare v_kat bigint; v_efter int;
begin
  select mk.id into v_kat from public.menu_kategorier mk
   where mk.lokation_id = 'mosede'
     -- ⚠️ IKKE lower(): med locale C bliver 'Ø' ikke til 'ø' (målt lokalt
     -- 29/9 — filen oprettede tavst ingenting). Kategorien hedder 'Øl'.
     and btrim(mk.navn) in ('Øl', 'øl')
   limit 1;
  if v_kat is null then
    raise exception 'Kategorien Øl findes ikke for mosede. Intet er aendret.';
  end if;
  if exists (select 1 from public.menu_varer x where x.kategori_id = v_kat
              and lower(btrim(x.navn)) = 'flaske øl, stor lux 75 cl') then
    return;
  end if;
  select coalesce(max(x.sortering), 0) into v_efter from public.menu_varer x
   where x.kategori_id = v_kat and lower(btrim(x.navn)) = 'gylden dame / lux';
  update public.menu_varer set sortering = sortering + 1
   where kategori_id = v_kat and sortering > v_efter;
  insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, sortering, aktiv, lokation_id)
  values (v_kat, 'Flaske øl, stor Lux 75 cl', null, 80, v_efter + 1, true, 'mosede');
end $$;

-- 3) Sandwichens nye variant, sidst før "Spørg gerne"
update public.menu_varer mv
   set valg = (select jsonb_agg(e order by (e = '"Spørg gerne"'::jsonb), o)
                 from jsonb_array_elements(mv.valg || '["Dagens pålægssalat"]'::jsonb) with ordinality t(e, o))
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = 'sandwich'
   and lower(btrim(mv.navn)) = 'sandwich'
   and jsonb_typeof(mv.valg) = 'array'
   and not mv.valg ? 'Dagens pålægssalat';

commit;

-- ------------------------------------------------------------
--  RAPPORT — hver kolonne skal stå, som navnet siger.
-- ------------------------------------------------------------
with v as (
  select mv.*, mk.navn as kat from public.menu_varer mv
    join public.menu_kategorier mk on mk.id = mv.kategori_id
   where mk.lokation_id = 'mosede')
select
  (select string_agg(navn || ' ' || pris, ', ' order by navn) from v
    where kat = 'Burgere' and navn in ('Bearnaiseburger', 'Chilinaiseburger') and aktiv)
                                                           as burgere_skal_vaere_90_og_90,
  (select pris from v where kat = 'Øl' and navn = 'Flaske øl, stor Lux 75 cl' and aktiv)
                                                           as stor_lux_skal_vaere_80,
  (select jsonb_array_length(valg) from v where kat = 'Sandwich' and navn = 'Sandwich')
                                                           as sandwich_varianter_skal_vaere_15,
  (select valg ->> -2 from v where kat = 'Sandwich' and navn = 'Sandwich')
                                                           as naestsidste_skal_vaere_dagens_paalaegssalat;
