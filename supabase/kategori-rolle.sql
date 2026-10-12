-- ============================================================
--  KATEGORIENS FASTE MÆRKE  (12. okt 2026)
--  ------------------------------------------------------------
--  Mikkels spørgsmål: *"de blir proppet under de rigtige sektioner
--  og nemt at finde rundt i?"* — og svaret på forslaget: *"fix til
--  perfektion"*.
--
--  MÅLT: seks steder på hjemmesiden fandt deres varer på kategoriens
--  NAVN — bestillingens smørrebrød, håndmadder og fyld, tapassiden,
--  forsidens tapaspris, menukortets tapasknap og cateringens fire
--  «fra»-priser. Omdøbte ejeren «Smørrebrød», forsvandt 32 varer fra
--  bestil/ uden en fejl nogen steder.
--
--  NU har kategorien et mærke (`rolle`), som vælges i admin
--  («Bruges på siden som»), og navnet er bare et navn. Filen her
--  sætter mærkerne ÉN gang ud fra navnene, som de står i dag — samme
--  mønstre, som siden brugte — og kun hvor der intet mærke er, så en
--  ny kørsel ikke skriver oven i ejerens valg.
--
--  ⚠️ RÆKKEFØLGEN I CASE TÆLLER: «Vælg fyld til smørrebrødet» har
--  begge ord, og det er fyld. Samme rækkefølge som Butik.katRolle.
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Prøven er supabase/proev-kategori-rolle.sql.
-- ============================================================

begin;

alter table public.menu_kategorier add column if not exists rolle text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kategori_rolle_ok') then
    alter table public.menu_kategorier add constraint kategori_rolle_ok
      check (rolle is null or rolle in
        ('smoerrebroed', 'haandmadder', 'fyld', 'tapas', 'pindemad', 'sliders'));
  end if;
end $$;

comment on column public.menu_kategorier.rolle is
  'Hvor siden bruger kategorien: smoerrebroed/haandmadder/fyld (bestillingens smørrebrød), tapas (tapassiden og forsidens pris), pindemad og sliders (cateringens priser). Tom = en almindelig kategori. Navnet kan rettes frit.';

update public.menu_kategorier
   set rolle = case
     when navn ~* 'fyld'       then 'fyld'
     when navn ~* 'håndmad'    then 'haandmadder'
     when navn ~* 'smørrebrød' then 'smoerrebroed'
     when navn ~* 'tapas'      then 'tapas'
     when navn ~* 'pindemad'   then 'pindemad'
     when navn ~* 'slider'     then 'sliders'
   end
 where rolle is null
   and navn ~* '(fyld|håndmad|smørrebrød|tapas|pindemad|slider)';

commit;

/* Supabases SQL Editor viser kun den SIDSTE sætnings svar: hvilke
   kategorier fik hvilket mærke. Står en forkert, rettes den i admin. */
select rolle, string_agg(navn, ', ' order by sortering) as kategorier
  from public.menu_kategorier
 where rolle is not null
 group by rolle
 order by rolle;
