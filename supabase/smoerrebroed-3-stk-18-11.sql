-- ============================================================
--  SMØRREBRØD: ALM. 39 / STORT 55, 3 STK.-PRIS, HERREGÅRDSBØF  (18/11 2026)
--  ------------------------------------------------------------
--  Jim 18/11: *"Vi fjerner håndmad, fremover har vi kun
--    Alm. Smørrebrød til 39,-Kr. 3Stk. 110,-Kr.
--    Stort Smørrebrød 55,-Kr.  3 Stk. 140,-Kr.
--  Ala carte: Herregårdsbøf 105,-Kr."*
--  Og: rejemad og tartar er faste 99,-; Herregårdsbøf med pommes
--  frites, bearnaise og grønne ærter skal kunne bestilles.
--
--  Filen gør fire ting:
--   1) Kategorien får en «3 stk.-pris»: antal, pris og den stykpris,
--      der tæller med. Rejemad (99) og fiskefilet med rejer (65) har
--      deres egen pris og tæller derfor IKKE med.
--   2) Databasen regner 3 stk.-prisen efter. Siden sender den som en
--      fradragslinje («3 stk. Alm. smørrebrød 110,-», −7 kr. pr. sæt),
--      og værnet afviser en linje, der ikke passer til kurven.
--   3) Håndmadder → «Alm. smørrebrød» til 39,-; Smørrebrød → «Stort
--      smørrebrød» (55,-); rejemad og tartar 95 → 99.
--   4) Herregårdsbøf 105,- under retterne (samme kategori som Pariserbøf).
--
--  Man må blande slags: 2 × leverpostej + 1 × rullepølse er 3 stk.
--
--  ⚠️ KØR lancering-28-10.sql FØR (den er kørt i produktionen).
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================
begin;

-- ---------- 1) 3 stk.-prisen på kategorien --------------------------
alter table public.menu_kategorier add column if not exists pakke_antal int;
alter table public.menu_kategorier add column if not exists pakke_pris numeric;
alter table public.menu_kategorier add column if not exists pakke_stykpris numeric;
alter table public.menu_kategorier drop constraint if exists kategori_pakke_ok;
alter table public.menu_kategorier add constraint kategori_pakke_ok check (
  (pakke_antal is null and pakke_pris is null and pakke_stykpris is null)
  or (pakke_antal between 2 and 20 and pakke_pris > 0 and pakke_stykpris > 0
      and pakke_pris < pakke_antal * pakke_stykpris));

-- ---------- 2) Værnet regner fradraget efter -------------------------
/* Kaldes af mosede_gaestens_regler for en linje med "pakke": <kategori>.
   Sættene = de linjer i kategorien, der koster præcis stykprisen,
   delt med antallet, rundet ned. Linjens antal skal være dét, og
   prisen skal være pakkeprisen minus stykprisen × antal. */
create or replace function public.mosede_pakke_tjek(p_linjer jsonb, p_linje jsonb, p_lok text)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  k public.menu_kategorier;
  v_n numeric;
  v_saet numeric;
  v_navn text := coalesce(p_linje ->> 'navn', '');
begin
  if coalesce(p_linje ->> 'pakke', '') !~ '^[0-9]{1,12}$' then
    raise exception 'bestilling_pakke_forkert: %', v_navn;
  end if;
  select * into k from public.menu_kategorier c
   where c.id = (p_linje ->> 'pakke')::bigint
     and (c.lokation_id is null or c.lokation_id = p_lok)
     and c.aktiv;
  if k.id is null or k.pakke_antal is null then
    raise exception 'bestilling_pakke_forkert: %', v_navn;
  end if;
  -- én fradragslinje pr. kategori
  if (select count(*) from jsonb_array_elements(coalesce(p_linjer, '[]'::jsonb)) l
       where l ->> 'pakke' = p_linje ->> 'pakke') <> 1 then
    raise exception 'bestilling_pakke_forkert: %', v_navn;
  end if;
  select coalesce(sum((l ->> 'antal')::numeric), 0) into v_n
    from jsonb_array_elements(coalesce(p_linjer, '[]'::jsonb)) l
   where coalesce(l ->> 'emballage', '') <> 'true'
     and jsonb_typeof(l -> 'antal') = 'number'
     and jsonb_typeof(l -> 'pris') = 'number'
     and (l ->> 'pris')::numeric = k.pakke_stykpris
     and exists (select 1 from public.menu_varer v
                  where v.kategori_id = k.id and v.aktiv and not v.udsolgt
                    and v.pris = k.pakke_stykpris
                    and lower(btrim(v.navn)) = lower(btrim(coalesce(l ->> 'navn', ''))));
  v_saet := floor(v_n / k.pakke_antal);
  if v_saet < 1
     or jsonb_typeof(p_linje -> 'antal') is distinct from 'number'
     or (p_linje ->> 'antal')::numeric <> v_saet
     or jsonb_typeof(p_linje -> 'pris') is distinct from 'number'
     or (p_linje ->> 'pris')::numeric <> k.pakke_pris - k.pakke_antal * k.pakke_stykpris then
    raise exception 'bestilling_pakke_forkert: %', v_navn;
  end if;
end $function$;
revoke all on function public.mosede_pakke_tjek(jsonb, jsonb, text) from public, anon, authenticated;

/* Værnets tillægsgren (afsnit C) kender emballage og levering. Her
   sættes 3 stk.-linjen ind som den tredje — i den funktion, der står i
   databasen NU, så intet andet i værnet skrives om. Findes stedet ikke
   præcis én gang, stopper filen, og intet er ændret. */
do $do$
declare
  d text;
  gammel text := $g$      elsif navnet = 'levering' and new.hvordan = 'levering' then
        v_tal := public.mosede_tal(v_i -> 'leverings_gebyr');
      else$g$;
  ny text := $n$      elsif navnet = 'levering' and new.hvordan = 'levering' then
        v_tal := public.mosede_tal(v_i -> 'leverings_gebyr');
      elsif linje ? 'pakke' then
        -- 3 stk.-prisen (smoerrebroed-3-stk-18-11.sql)
        perform public.mosede_pakke_tjek(new.linjer, linje, new.lokation_id);
        continue;
      else$n$;
begin
  d := pg_get_functiondef('public.mosede_gaestens_regler()'::regprocedure);
  if position('mosede_pakke_tjek' in d) > 0 then
    raise notice 'Værnet kender allerede 3 stk.-prisen.';
    return;
  end if;
  if (length(d) - length(replace(d, gammel, ''))) / length(gammel) <> 1 then
    raise exception 'Værnet ser ikke ud som ventet (lancering-28-10.sql). Intet er ændret — sig til Lesreg.';
  end if;
  execute replace(d, gammel, ny);
end $do$;

-- ---------- 3) Smørrebrødet ------------------------------------------
/* SKRIV SOM EJEREN: `menu_vare_pris_ejer` (roller.sql) afviser en
   prisændring fra en fil uden claims. Samme greb som
   chefens-rettelser-7-10.sql. Gælder kun denne transaktion. */
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

-- Alm. smørrebrød (før Håndmadder): 39,-, 3 stk. 110,-, står først
update public.menu_kategorier set
  navn = 'Alm. smørrebrød',
  note = 'Stk. 39,- · 3 stk. 110,- (bland frit). Hjemmebagt rugbrød med smør, smurt når du bestiller. Glutenfrit brød eller uden smør — bare sig til.',
  oversaettelser = coalesce(oversaettelser, '{}'::jsonb)
    || jsonb_build_object('en', coalesce(oversaettelser -> 'en', '{}'::jsonb)
         || '{"navn": "Open sandwiches, regular"}'::jsonb),
  pakke_antal = 3, pakke_pris = 110, pakke_stykpris = 39
 where lokation_id = 'mosede' and rolle = 'haandmadder';

-- Stort smørrebrød (før Smørrebrød): 55,-, 3 stk. 140,-
update public.menu_kategorier set
  navn = 'Stort smørrebrød',
  note = 'Stk. 55,- · 3 stk. 140,- (bland frit). Rejemad og tartar 99,-. Hjemmebagt rugbrød med smør, smurt når du bestiller.',
  oversaettelser = coalesce(oversaettelser, '{}'::jsonb)
    || jsonb_build_object('en', coalesce(oversaettelser -> 'en', '{}'::jsonb)
         || '{"navn": "Open sandwiches, large"}'::jsonb),
  pakke_antal = 3, pakke_pris = 140, pakke_stykpris = 55
 where lokation_id = 'mosede' and rolle = 'smoerrebroed';

-- Alm. før stort på siden og kortet
update public.menu_kategorier a set sortering = s.sortering - 1
  from public.menu_kategorier s
 where a.lokation_id = 'mosede' and a.rolle = 'haandmadder'
   and s.lokation_id = 'mosede' and s.rolle = 'smoerrebroed'
   and a.sortering >= s.sortering;

-- Varerne: ", håndmad" → ", alm." og 27 → 39
update public.menu_varer v set
  navn = regexp_replace(v.navn, ',\s*håndmad\s*$', ', alm.', 'i'),
  pris = case when v.pris = 27 then 39 else v.pris end
  from public.menu_kategorier k
 where k.id = v.kategori_id and k.lokation_id = 'mosede' and k.rolle = 'haandmadder';

-- Rejemad og tartar: faste 99,-
update public.menu_varer v set pris = 99
  from public.menu_kategorier k
 where k.id = v.kategori_id and k.lokation_id = 'mosede' and k.rolle = 'smoerrebroed'
   and lower(btrim(v.navn)) in ('rejemad', 'tartarmad') and v.pris = 95;

-- ---------- 4) Herregårdsbøf ------------------------------------------
insert into public.menu_varer (kategori_id, lokation_id, navn, beskrivelse, pris, sortering, aktiv, oversaettelser)
select p.kategori_id, 'mosede', 'Herregårdsbøf', 'Med pommes frites, bearnaise og grønne ærter', 105,
       coalesce(p.sortering, 0), true,
       '{"en": {"navn": "Herregårdsbøf – steak", "beskrivelse": "With French fries, béarnaise sauce and green peas"}}'::jsonb
  from public.menu_varer p
 where p.lokation_id = 'mosede' and lower(btrim(p.navn)) = 'pariserbøf'
   and not exists (select 1 from public.menu_varer x
                    where x.lokation_id = 'mosede' and lower(btrim(x.navn)) = 'herregårdsbøf')
 order by p.aktiv desc, p.id
 limit 1;

commit;

notify pgrst, 'reload schema';

select case when position('mosede_pakke_tjek' in pg_get_functiondef('public.mosede_gaestens_regler()'::regprocedure)) > 0
             and exists (select 1 from public.menu_kategorier where lokation_id = 'mosede' and pakke_pris = 110)
             and exists (select 1 from public.menu_kategorier where lokation_id = 'mosede' and pakke_pris = 140)
             and exists (select 1 from public.menu_varer where lokation_id = 'mosede' and navn = 'Herregårdsbøf')
            then '✅ Nye smørrebrødspriser, 3 stk.-pris og Herregårdsbøf er klar'
            else '❌ Noget gik galt — sig til Lesreg' end as svar;
