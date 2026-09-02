-- ============================================================
--  DAGSVÆRNET SKAL IKKE SVARE FOR EN SLUKKET VARE  (2. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER menukort-antal-og-dage.sql. Filen kan køres igen
--  uden at ødelægge noget: den erstatter én funktion.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  `mosede_kategori_dag_vaern` spurgte, om navnet fandtes på
--  kortet, UDEN at kræve at rækken var tændt — mens
--  `mosede_pris_vaern` kræver `v.aktiv and k.aktiv` i BEGGE sine
--  led. Et navn, der kun findes som en SLUKKET række, blev
--  derfor afvist med `bestilling_ikke_den_dag`.
--
--  Det modsiger funktionens egen note ordret:
--    "Navne, der ikke står på kortet, røres ikke."
--  En slukket række står ikke på kortet.
--
--  Fundet 2/9, da proev-bord-uden-telefon.sql faldt i
--  produktionen: den bestilte "Håndmad", som
--  smoerrebroed-kortet.sql slukkede 1/9, og fik at vide, at den
--  "ikke laves den dag". Beskeden pegede et helt forkert sted
--  hen, og det kostede en runde.
--
--  ⚠️ INTET SLIPPER IGENNEM, DER IKKE GJORDE FØR.
--  `mosede_udsolgt_vaern` (bord-loft.sql) tæller en slukket
--  række som "udsolgt eller skjult" — MED VILJE, og med en
--  besked, der passer: `bestilling_udsolgt_vare`. Den afviser
--  altså stadig varen; forskellen er kun, HVILKET værn der
--  svarer, og at svaret nu er sandt.
--
--  ⚠️ OG DEN ANDEN HALVDEL ER URØRT: er navnet tændt på kortet,
--  men kategorien laves ikke den ugedag, afvises den som før.
--  Det er hele grunden til, at værnet findes.
-- ============================================================

begin;

create or replace function public.mosede_kategori_dag_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linje  jsonb;
  navnet text;
begin
  if new.linjer is null then return new; end if;

  for linje in select * from jsonb_array_elements(new.linjer)
  loop
    navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
    if navnet = '' then continue; end if;

    /* ⚠️ `v.aktiv and k.aktiv` I BEGGE LED — det er hele
       ændringen. Uden det i det FØRSTE led betød "findes på
       kortet" også "findes som en slukket række", og så kunne
       det andet led aldrig blive sandt: en slukket række er
       hverken tændt eller på en dag. */
    if exists (
      select 1
        from public.menu_varer v
        join public.menu_kategorier k on k.id = v.kategori_id
       where lower(btrim(v.navn)) = navnet
         and (k.lokation_id is null or k.lokation_id = new.lokation_id)
         and v.aktiv and k.aktiv
    ) and not exists (
      select 1
        from public.menu_varer v
        join public.menu_kategorier k on k.id = v.kategori_id
       where lower(btrim(v.navn)) = navnet
         and (k.lokation_id is null or k.lokation_id = new.lokation_id)
         and v.aktiv and k.aktiv
         and public.mosede_kategori_paa_dagen(k.dage, new.hent_dato)
    ) then
      raise exception 'bestilling_ikke_den_dag: %', coalesce(linje ->> 'navn', '');
    end if;
  end loop;

  return new;
end $$;

comment on function public.mosede_kategori_dag_vaern() is
  'Afviser en bestilling på en TÆNDT vare, hvis kategorien ikke laves den ugedag. Navne, der ikke står på kortet — og slukkede rækker gør ikke — røres ikke; dem svarer udsolgt-værnet for.';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from pg_trigger
    where tgrelid = to_regclass('public.bestillinger')
      and tgname = 'bestilling_kategori_dag')
    as "dagsvaernet (skal være 1)",
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mosede_kategori_dag_vaern'
      and pg_get_functiondef(p.oid) like '%and v.aktiv and k.aktiv%and not exists%')
    as "med aktiv i begge led (skal være 1)";
