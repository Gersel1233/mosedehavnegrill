-- ============================================================
--  SÆT KODERNE PÅ DE TRE FÆLLES LOGINS  (28/10 2026)
-- ------------------------------------------------------------
--  Brug den, når et login FINDES i Authentication og skal have en
--  ny kode (fx bogholderi@, som har haft en kode siden 15/9). Et
--  login, der ikke findes, oprettes i dashboardet: Authentication →
--  Users → Add user → Create new user (sæt flueben i Auto Confirm).
--
--  ⚠️ SAMME VÆRN SOM saet-de-to-koder-4-10.sql — læs dens historie.
--  En pladsholder, der FUNGERER, er en kode, nogen kommer til at
--  bruge. Derfor: et felt, der stadig siger SKRIV-, springes over,
--  og står de alle tre sådan, nægter filen at gøre noget.
--
--  ⚠️ KODERNE SENDES IKKE TIL NOGEN. Skriv dem herunder i Supabase →
--  SQL Editor (projektet epwyjzakvvbxtpvnhvbn), tryk Run, og luk
--  fanen — SQL Editor husker det, der stod i den. Commit ALDRIG
--  filen med rigtige koder i, og send dem ikke til Lesreg.
--
--  ⚠️ EN iPAD, DER ER LOGGET IND, BLIVER IKKE SMIDT UD. Den nye kode
--  gælder, næste gang nogen logger ind.
-- ============================================================

do $$
declare
  -- ---- SKRIV KODERNE HER, OG KUN HER ------------------------
  --  Lad en stå med SKRIV-, hvis den ikke skal skiftes.
  kode_chefer   text := 'SKRIV-CHEFERNES-KODE-HER';     -- bogholderi@mosedehavnecafe.dk
  kode_kolleger text := 'SKRIV-KOLLEGERNES-KODE-HER';   -- booking@mosedehavnecafe.dk
  kode_event    text := 'SKRIV-EVENTUDVALGETS-KODE-HER'; -- eventudvalg1010
  -- -----------------------------------------------------------
  par   text[][] := array[
    array['bogholderi@mosedehavnecafe.dk',      kode_chefer],
    array['booking@mosedehavnecafe.dk',         kode_kolleger],
    array['eventudvalg1010@mosedehavnecafe.dk', kode_event]];
  i     int;
  sat   int := 0;
  n     int;
  rigtige text[] := '{}';
begin
  for i in 1 .. 3 loop
    if par[i][2] not like 'SKRIV-%' then
      if length(par[i][2]) < 10 then
        raise exception 'Koden til % er under 10 tegn — for kort til en admin med gæsternes navne og telefonnumre. Intet er ændret.', par[i][1];
      end if;
      if par[i][2] = any (rigtige) then
        raise exception 'To af koderne er ens. Hvert login skal have sin egen — ellers er rollerne ingenting værd. Intet er ændret.';
      end if;
      rigtige := rigtige || par[i][2];
    end if;
  end loop;

  if cardinality(rigtige) = 0 then
    raise exception 'Ingen koder er skrevet ind endnu — alle tre står stadig med SKRIV-. Intet er ændret.';
  end if;

  for i in 1 .. 3 loop
    continue when par[i][2] like 'SKRIV-%';
    update auth.users
       set encrypted_password = extensions.crypt(par[i][2], extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where lower(email) = par[i][1];
    get diagnostics n = row_count;
    /* ⚠️ EN SQL, DER RAMMER NUL RÆKKER, SIGER "Success" OG ER TAVS. */
    if n <> 1 then
      raise exception '% findes ikke i Authentication. Opret den først: Authentication → Users → Add user → Create new user. Intet er ændret.', par[i][1];
    end if;
    sat := sat + 1;
  end loop;

  raise notice '% kode(r) er sat. Luk SQL Editor-fanen nu.', sat;
end $$;

select '✅ Koderne er sat — luk den her fane nu, så de ikke står i SQL Editor.' as svar;
