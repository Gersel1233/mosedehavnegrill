-- ============================================================
--  ET TOMT BORD ER IKKE ET AFSLAG
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER borde.sql. Filen kan køres igen.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  En bekræftet bordbestilling havde ÉT sted at gå hen: Afvis.
--  Men at "afvise" et bord, gæsten skulle have siddet ved, er
--  forkert — vi sagde jo ja. Uden et andet ord skete én af to
--  ting:
--
--    · udeblivelsen blev skrevet som et afslag, og så kan man
--      ikke længere se forskel på "vi kunne ikke" og "de kom
--      ikke", eller
--    · der blev slet ikke trykket, og bookingen stod som
--      kommende for evigt.
--
--  Bestillingerne har haft 'udeblevet' siden udeblivelser.sql —
--  maden blev lavet, ingen kom. Bordene har den samme
--  begivenhed: seks pladser blev holdt fri, ingen satte sig.
--
--  ⚠️ OG NUMMERET ER POINTEN. En familie, der booker seks
--  pladser hver lørdag og aldrig kommer, skal kunne ses FØR
--  næste lørdag. Det kan den kun, hvis udeblivelsen har sit eget
--  ord.
--
--  ------------------------------------------------------------
--  ⚠️ KØRES borde.sql IGEN BAGEFTER, SNÆVRES LISTEN IND
--  ------------------------------------------------------------
--  Så kan personalet ikke trykke Udeblev mere, og fejlen ser ud
--  som en knap, der ikke virker. Det er den samme fælde som
--  restaurant.sql beskriver ved statuslisten på bestillinger.
--  Tjek 111 i er-vi-klar.sql fanger det.
-- ============================================================

begin;

alter table public.bordbestillinger
  drop constraint if exists bord_status_ok;

alter table public.bordbestillinger
  add constraint bord_status_ok
  check (status in ('ny', 'bekraeftet', 'afvist', 'udeblevet'));

comment on constraint bord_status_ok on public.bordbestillinger is
  'ny → bekraeftet → afvist/udeblevet. Udeblevet er IKKE et afslag: vi sagde ja, gæsten kom ikke.';

commit;


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  case when (select pg_get_constraintdef(oid) from pg_constraint
              where conname = 'bord_status_ok'
                and conrelid = 'public.bordbestillinger'::regclass)
            like '%udeblevet%'
       then '✅ UDEBLEVET ER TILLADT PÅ BORDENE — kør supabase/proev-bord-udeblev.sql'
       else '❌ NOGET GIK GALT — værnet kender ikke udeblevet. Læs fejlen ovenfor'
  end as svar;
