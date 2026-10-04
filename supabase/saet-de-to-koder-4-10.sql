-- ============================================================
--  SÆT KODERNE PÅ DE TO LOGINS  (4/10 2026)
-- ------------------------------------------------------------
--  ⚠️⚠️ DEN HER FIL KOSTEDE EN RIGTIG FEJL SAMME DAG, DEN BLEV
--  SKREVET — LÆS DET HER, FØR DU RETTER I DEN.
--
--  Første udgave havde de to koder skrevet direkte ind i hver
--  sin `update`, som `'SKRIV-CHEFENS-KODE-HER'`. Mikkel kørte
--  filen, som den stod, og spurgte bagefter: *"yes den er kørt
--  men hvad er koden"*. Svaret var: pladsholderen SELV var
--  blevet koden. Begge logins stod med en adgangskode, der
--  ordret kunne læses i det offentlige GitHub-repo.
--
--  Ingen nåede at bruge det — auth-loggen viste nul logins i
--  vinduet — men det var held, ikke design. Fejlen er filens:
--  en pladsholder, der FUNGERER, er ikke en pladsholder. Den er
--  en kode, nogen kommer til at bruge.
--
--  Derfor står koderne ÉT sted nu, øverst, og filen NÆGTER at
--  køre, hvis de ikke er skiftet. Et værn, der standser dig, er
--  billigere end en admin, hvem som helst kan logge ind i.
--
--  ⚠️ OG KODERNE SENDES IKKE TIL NOGEN. Skriv dem her, kør
--  filen i Supabase → SQL Editor på projektet
--  epwyjzakvvbxtpvnhvbn, og luk så fanen — SQL Editor husker
--  det, der stod i den. Commit ALDRIG filen med rigtige koder i.
--
--  ⚠️ iPAD'EN BLIVER IKKE SMIDT UD. En kode skiftet med SQL
--  rører ikke de sessioner, der kører. Køkkenet opdager ikke
--  det her midt i en frokost; den nye kode gælder, næste gang
--  nogen logger ind.
-- ============================================================

do $$
declare
  -- ---- SKRIV DE TO KODER HER, OG KUN HER --------------------
  kode_chef      text := 'SKRIV-CHEFENS-KODE-HER';
  kode_personale text := 'SKRIV-PERSONALETS-KODE-HER';
  -- -----------------------------------------------------------
  n int;
begin
  /* ⚠️ VÆRNET, DER MANGLEDE 4/10. */
  if kode_chef like 'SKRIV-%' or kode_personale like 'SKRIV-%' then
    raise exception
      'Koderne er ikke skrevet ind endnu — pladsholderne står der stadig. Intet er aendret.';
  end if;

  /* To ens koder gør forskellen mellem chef og medarbejder til
     ingenting: chefen kan se salgstal og personale, køkkenet kan
     ikke, og det værn er kun koden værd. */
  if kode_chef = kode_personale then
    raise exception 'De to koder er ens. Chefens og koekkenets login skal have hver sin. Intet er aendret.';
  end if;

  if length(kode_chef) < 10 or length(kode_personale) < 10 then
    raise exception 'En kode under 10 tegn er for kort til en admin med gaesternes navne og telefonnumre. Intet er aendret.';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(kode_chef, extensions.gen_salt('bf')),
         updated_at = now()
   where email = 'bogholderi@mosedehavnecafe.dk';

  update auth.users
     set encrypted_password = extensions.crypt(kode_personale, extensions.gen_salt('bf')),
         updated_at = now()
   where email = 'kontakt@mosedehavnecafe.dk';

  /* ⚠️ EN SQL, DER RAMMER NUL RÆKKER, SIGER "Success" OG ER TAVS.
     En stavefejl i en e-mail ville se ud, som om det virkede. */
  select count(*) into n
    from auth.users
   where email in ('bogholderi@mosedehavnecafe.dk', 'kontakt@mosedehavnecafe.dk')
     and updated_at > now() - interval '1 minute';
  if n <> 2 then
    raise exception 'Kun % af 2 koder blev sat. Tjek e-mailerne i filen.', n;
  end if;

  raise notice 'Begge koder er sat. Luk SQL Editor-fanen.';
end $$;

-- ---- OG STÅR ROLLERNE RIGTIGT? -----------------------------
--  Kør den her bagefter. Der skal stå præcis det her:
--    bogholderi@mosedehavnecafe.dk   ejer          Cheferne
--    kontakt@mosedehavnecafe.dk      medarbejder   Personalet
--    skoleskiderikkerne@gmail.com    ejer          Lesreg — support
select a.email, a.rolle, a.navn, a.aktiv
  from public.admin_adgang a
 where a.lokation_id = 'mosede'
 order by a.rolle, a.email;
