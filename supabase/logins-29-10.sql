-- ============================================================
--  DE TRE FÆLLES LOGINS TIL LANCERINGEN  (28/10 2026, aftenen før)
--  ------------------------------------------------------------
--  Mikkels ord: *"lige nu må brugerne gerne gå igennem dem, så
--  altså kan vi ikke fjerne de gamle bortset fra skoleskiderikkerne
--  … cheferne er bogholder@ og kolleger er booking@ og
--  eventudvalget er bare en custom, der hedder eventudvalg1010"*.
--
--  Efter filen har admin præcis fire logins:
--
--    bogholderi@mosedehavnecafe.dk        Ejer        Cheferne
--    booking@mosedehavnecafe.dk           Medarbejder Kollegerne
--    eventudvalg1010@mosedehavnecafe.dk   Arrangør    Eventudvalget
--    skoleskiderikkerne@gmail.com         Ejer        Lesreg — support
--
--  ⚠️ "bogholder@" I BESKEDEN ER bogholderi@ — chefernes login, der
--  har virket siden 15/9. Det er den adresse, der står i
--  Authentication; en ny "bogholder@" ville være et login uden kode.
--
--  ⚠️ eventudvalg1010 ER ET BRUGERNAVN. Supabase kender kun e-mails,
--  så brugeren hedder eventudvalg1010@mosedehavnecafe.dk. På
--  login-siden skriver man bare "eventudvalg1010" (js/store.js,
--  loginMail). Adressen behøver ikke at kunne modtage post.
--
--  ALLE ANDRE logins til Mosede fjernes fra admin. Deres bruger i
--  Authentication bliver stående, men de kan ikke åbne admin længere.
--
--  ⚠️ FILEN RØRER INGEN KODER. Koderne sætter du selv — se svaret
--  nederst, og supabase/saet-koderne-29-10.sql.
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================
begin;

-- 1) De fire, der skal være der — først, så der altid står en ejer.
insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('bogholderi@mosedehavnecafe.dk',      'mosede', 'ejer',        true, 'Cheferne'),
  ('booking@mosedehavnecafe.dk',         'mosede', 'medarbejder', true, 'Kollegerne'),
  ('eventudvalg1010@mosedehavnecafe.dk', 'mosede', 'arrangoer',   true, 'Eventudvalget'),
  ('skoleskiderikkerne@gmail.com',       'mosede', 'ejer',        true, 'Lesreg — support')
on conflict (email, lokation_id) do update
  set rolle = excluded.rolle, aktiv = true, navn = excluded.navn;

-- 2) Alle andre fjernes. Hvem det var, står i svaret nederst.
create temp table if not exists _fjernet (email text, rolle text) on commit preserve rows;
truncate _fjernet;

with ud as (
  delete from public.admin_adgang
   where lokation_id = 'mosede'
     and lower(email) not in ('bogholderi@mosedehavnecafe.dk',
                              'booking@mosedehavnecafe.dk',
                              'eventudvalg1010@mosedehavnecafe.dk',
                              'skoleskiderikkerne@gmail.com')
  returning email, rolle
)
insert into _fjernet select email, rolle from ud;

commit;

/* Supabases SQL Editor viser kun den SIDSTE sætnings svar — så det
   hele står her: de fire, om de har et login, og hvem der er fjernet. */
select
  case
    when f.email is not null then '🗑️ fjernet'
    when exists (select 1 from auth.users u where lower(u.email) = lower(a.email)) then '✅ klar'
    else '⚠️ mangler login'
  end                                       as " ",
  coalesce(a.email, f.email)                as "Login",
  coalesce(a.rolle, f.rolle)                as "Rolle",
  case
    when f.email is not null then 'Kan ikke længere åbne admin.'
    when exists (select 1 from auth.users u where lower(u.email) = lower(a.email))
      then 'Har et login. Ny kode? Brug supabase/saet-koderne-29-10.sql.'
    else 'Opret den: Authentication → Users → Add user → Create new user → '
         || a.email || ', en kode, og sæt flueben i Auto Confirm User.'
  end                                       as "Hvad nu"
from (select email, rolle from public.admin_adgang where lokation_id = 'mosede') a
full join _fjernet f on false
order by f.email nulls first, a.rolle, a.email;
