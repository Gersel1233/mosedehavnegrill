/* ============================================================
   MAIL ELLER NUMMER — ÉN VEJ TILBAGE ER NOK  (29/8-2026)
   ------------------------------------------------------------
   Kundens ord om baglokalet: "lade email eller nummer være som
   en option ... inden for et døgn er aftalen afstemt via enten
   mail eller nummer."

   Sådan så det ud før: telefon var `not null` MED et krav om
   8-15 cifre. En gæst, der kun ville skrive sin mail, blev
   afvist af databasen — og fik en fejl, hun ikke kunne gøre
   noget ved.

   ⚠️ KRAVET FORSVINDER IKKE. Det flytter: der skal stadig være
   EN vej tilbage, ellers er forespørgslen et menneske, ingen kan
   svare. Nu er reglen "et gyldigt nummer ELLER en gyldig mail" —
   og de to gamle regler gælder stadig hver for sig, når feltet
   ER udfyldt. Et nummer på fire cifre er stadig en tastefejl.

   ⚠️ TELEFON BLIVER TOM STRENG, IKKE NULL. Kolonnen er `not
   null`, og at fjerne det ville betyde en ændring i alt, der
   læser den (admin viser `f.telefon` fem steder). En tom streng
   er den mindste ændring, og klienten sender allerede det.

   KØR DEN I MOSEDE-PROJEKTET (epwyjzakvvbxtpvnhvbn — tjek
   projekt-id'et i adresselinjen!). Den er idempotent: kør den
   igen, hvis du er i tvivl.

   ⚠️ KØRES forespoergsler.sql IGEN BAGEFTER, skrives det gamle
   krav tilbage, og gæster med kun en mail bliver afvist igen.
   Så skal filen her køres igen. er-vi-klar.sql linje 114 fanger
   det.
   ============================================================ */

begin;

alter table public.forespoergsler
  drop constraint if exists forespoergsel_telefon_ok;

alter table public.forespoergsler
  drop constraint if exists forespoergsel_kontakt_ok;

alter table public.forespoergsler
  add constraint forespoergsel_kontakt_ok check (
    /* Et rigtigt nummer … */
    char_length(regexp_replace(coalesce(telefon, ''), '[^0-9]', '', 'g')) between 8 and 15
    /* … ELLER en rigtig mail. Mindst én af delene. */
    or (email is not null
        and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$')
  );

/* Og et nummer, der ER skrevet, skal stadig være et nummer: uden
   den her kunne "12" slippe igennem, så længe der stod en mail —
   og personalet ville ringe forgæves. */
alter table public.forespoergsler
  drop constraint if exists forespoergsel_telefon_form_ok;

alter table public.forespoergsler
  add constraint forespoergsel_telefon_form_ok check (
    coalesce(btrim(telefon), '') = ''
    or char_length(regexp_replace(telefon, '[^0-9]', '', 'g')) between 8 and 15
  );

commit;

/* Supabases SQL Editor viser kun den SIDSTE sætnings svar — se
   README. Derfor en select til sidst i stedet for en notice. */
select
  case
    when count(*) = 2 then '✅ KLAR — mail eller nummer er nok nu'
    else '❌ NOGET MANGLER: fandt ' || count(*) || ' af 2 regler'
  end as resultat
from pg_constraint
where conrelid = 'public.forespoergsler'::regclass
  and conname in ('forespoergsel_kontakt_ok', 'forespoergsel_telefon_form_ok');
