-- ============================================================
--  SÆT KODERNE PÅ DE TO LOGINS  (4/10 2026)
-- ------------------------------------------------------------
--  Mikkels ord, efter tre forsøg på at få Supabase til at sende
--  mails gennem Gmail: *"ærlig kan vi ik lade vær med det her og
--  bar sørge for at kontaktmosedehavnecafe kam logge ind og
--  bogholderi kan logge ind."*
--
--  Han har ret. Det er to logins. En selvbetjent nulstilling er
--  for meget maskineri, når mailen i sig selv er en kamp.
--
--  ⚠️ KODERNE SKRIVES HER AF DIG OG SENDES IKKE TIL NOGEN.
--  Kør filen i Supabase → SQL Editor på projektet
--  epwyjzakvvbxtpvnhvbn. Luk fanen bagefter; SQL Editor gemmer
--  det, der står i den.
--
--  ⚠️ OG DE TO KODER SKAL VÆRE FORSKELLIGE. Chefens login kan
--  alt — åbningstider, salgstal, personale. Køkkenets kan ikke.
--  Er koden den samme, er den forskel ingenting værd.
--
--  MÅLT, før filen blev skrevet:
--    bogholderi@  oprettet 15/9 09:46 · ALDRIG logget ind
--    kontakt@     logget ind én gang 15/9 11:58 · 1 session,
--                 der har levet lige siden (køkkenets iPad)
--
--  ⚠️ iPAD'EN BLIVER IKKE SMIDT UD. En kode skiftet med SQL
--  rører ikke de sessioner, der kører — køkkenet opdager ikke
--  det her midt i en frokost. Den nye kode gælder, næste gang
--  nogen logger ind.
-- ============================================================

-- ---- 1 · CHEFERNE (ejer — kan alt) -------------------------
update auth.users
   set encrypted_password = extensions.crypt('SKRIV-CHEFENS-KODE-HER',
                                             extensions.gen_salt('bf')),
       updated_at = now()
 where email = 'bogholderi@mosedehavnecafe.dk';

-- ---- 2 · PERSONALET (medarbejder — køkkenet) ---------------
update auth.users
   set encrypted_password = extensions.crypt('SKRIV-PERSONALETS-KODE-HER',
                                             extensions.gen_salt('bf')),
       updated_at = now()
 where email = 'kontakt@mosedehavnecafe.dk';

-- ---- 3 · VÆRN: skete der overhovedet noget? ----------------
--  ⚠️ EN SQL, DER RAMMER NUL RÆKKER, SIGER "Success" OG ER TAVS.
--  En stavefejl i en e-mail ville se ud som om, det virkede —
--  og først blive opdaget, når nogen ikke kan logge ind.
do $$
declare n int;
begin
  select count(*) into n
    from auth.users
   where email in ('bogholderi@mosedehavnecafe.dk', 'kontakt@mosedehavnecafe.dk')
     and updated_at > now() - interval '1 minute';
  if n <> 2 then
    raise exception 'Kun % af 2 koder blev sat. Tjek e-mailerne ovenfor — intet er sat, som du tror.', n;
  end if;
  raise notice 'Begge koder er sat.';
end $$;

-- ---- 4 · OG STÅR ROLLERNE RIGTIGT? -------------------------
--  Kør den her bagefter, og se at der står præcis det her:
--    bogholderi@mosedehavnecafe.dk   ejer          Cheferne
--    kontakt@mosedehavnecafe.dk      medarbejder   Personalet
--    skoleskiderikkerne@gmail.com    ejer          Lesreg — support
select a.email, a.rolle, a.navn, a.aktiv
  from public.admin_adgang a
 where a.lokation_id = 'mosede'
 order by a.rolle, a.email;
