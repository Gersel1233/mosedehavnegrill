-- ============================================================
--  OPGAVER: PERIODER OG UGEDAGE  (4. november 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER opgaver-3-11.sql. Kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Mikkel 4/11: *"og hvad hvis det er en uge frem, han laver dem,
--  eller 5 dage frem eller 2 uger?"* Jim skriver "gælder uge 46-47"
--  øverst og "Mandag", "Onsdag", "Fredag" over det, der kun skal
--  gøres de dage.
--
--    opgavelister.gyldig_fra / gyldig_til — listen står kun på
--      iPad'en de dage. Tom = altid (som før).
--    opgaver.ugedag (1 = mandag … 7 = søndag) og opgaver.dato —
--      opgaven står kun den ugedag eller den dato. Tom = hver dag.
--
--  Reglerne fra opgaver-3-11.sql gælder uændret: cheferne retter,
--  personalet sætter initialer.
-- ============================================================

begin;

alter table public.opgavelister add column if not exists gyldig_fra date;
alter table public.opgavelister add column if not exists gyldig_til date;
alter table public.opgaver      add column if not exists ugedag smallint;
alter table public.opgaver      add column if not exists dato   date;

alter table public.opgavelister drop constraint if exists opgavelister_periode_ok;
alter table public.opgavelister add constraint opgavelister_periode_ok
  check (gyldig_fra is null or gyldig_til is null or gyldig_til >= gyldig_fra);

alter table public.opgaver drop constraint if exists opgaver_ugedag_ok;
alter table public.opgaver add constraint opgaver_ugedag_ok
  check (ugedag is null or ugedag between 1 and 7);

commit;

select 'Opgavelister kan nu gælde en periode (fx uge 46-47), og opgaver kan stå på en bestemt dag'
  as resultat;
