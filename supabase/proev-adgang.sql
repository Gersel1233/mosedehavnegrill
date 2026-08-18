-- ============================================================
--  PRØVE AF ADGANGSREGLERNE FOR BESTILLINGER
--  ------------------------------------------------------------
--  Kør denne EFTER setup.sql, i Supabase → SQL Editor, eller mod
--  en tom Postgres. Den skriver ud hvad der sker, og hver linje
--  skal give det svar der står i kommentaren.
--
--  HVORFOR DEN FINDES. bestillinger er den eneste tabel hvor en
--  gæst må skrive og ikke må læse. Går den regel i stykker – fx
--  fordi nogen tilføjer en "for all"-politik i en fart – kan
--  enhver med anon-nøglen fra js/config.js hente navn og
--  telefonnummer på hver eneste kunde. Det er ikke noget man kan
--  se på skærmen at man har ødelagt. Derfor står prøven her.
--
--  Den blev i øvrigt skrevet før koden virkede, og den fangede
--  med det samme at "bigserial" gav gæsten "permission denied for
--  sequence" selv om RLS var i orden. Kolonnen er derfor en
--  identity-kolonne. Se noten i setup.sql.
--
--  Rækkerne den laver, ryddes til sidst.
-- ============================================================

\set ON_ERROR_STOP 0

begin;

/* Chefen til prøven.

   FØR flerlejer.sql stod der her en overskrivning af is_admin(),
   fordi adgangen var én e-mail skrevet ind i en funktion. Nu
   ligger adgangen i tabellen admin_adgang og gælder PR.
   FORRETNING, så chefen skrives ind dér i stedet.

   Det er ikke en oprydning, det var en fejl: kørte man den gamle
   udgave efter migrationen, sagde prøve 12 og 13 "chefen ser 0"
   og "UPDATE 0" — altså at personalet ikke kunne se sine egne
   bestillinger. Det var prøven der var forældet, ikke
   adgangsreglerne, men det er præcis den slags falske alarm der
   får folk til at holde op med at køre prøver.

   Rækken ruller tilbage med transaktionen til sidst. */
insert into public.admin_adgang (email, lokation_id)
values ('proeve@eksempel.dk', 'mosede')
on conflict do nothing;

\echo ''
\echo '=== SOM GÆST (anon) ==='
set local role anon;

\echo '--- 1) må indsætte en bestilling  → INSERT 0 1'
insert into public.bestillinger
  (reference, navn, telefon, hent_dato, hent_tid, linjer, antal, besked)
values ('PROEVE-1', 'Prøve Prøvesen', '28 87 13 43', current_date + 2, '12:00',
        '[{"navn":"Æggesalat med bacon","antal":4,"pris":45}]'::jsonb, 4, 'Uden agurk');

\echo '--- 2) må IKKE læse dem  → 0'
select count(*) as "raekker en gaest kan se" from public.bestillinger;

\echo '--- 3) må ikke indsætte som bekræftet  → violates row-level security'
savepoint p3;
insert into public.bestillinger (reference, navn, telefon, hent_dato, hent_tid, linjer, antal, status)
values ('PROEVE-2', 'Snyd', '12345678', current_date + 1, '12:00',
        '[{"navn":"x","antal":1}]'::jsonb, 1, 'bekraeftet');
rollback to savepoint p3;

\echo '--- 4) må ikke skrive i personalets note  → violates row-level security'
savepoint p4;
insert into public.bestillinger (reference, navn, telefon, hent_dato, hent_tid, linjer, antal, intern_note)
values ('PROEVE-3', 'Snyd', '12345678', current_date + 1, '13:00',
        '[{"navn":"x","antal":1}]'::jsonb, 1, 'ringet');
rollback to savepoint p4;

\echo '--- 5) må ikke rette  → UPDATE 0'
update public.bestillinger set status = 'afhentet';

\echo '--- 6) må ikke slette  → DELETE 0'
delete from public.bestillinger;

\echo '--- 7) dobbelttryk afvises  → bestilling_ikke_dobbelt'
savepoint p7;
insert into public.bestillinger (reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values ('PROEVE-4', 'Prøve Prøvesen', '28 87 13 43', current_date + 2, '12:00',
        '[{"navn":"x","antal":1}]'::jsonb, 1);
rollback to savepoint p7;

\echo '--- 8) fortidsdato afvises  → bestilling_dato_ok'
savepoint p8;
insert into public.bestillinger (reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values ('PROEVE-5', 'Prøve Prøvesen', '28871343', current_date - 5, '12:00',
        '[{"navn":"x","antal":1}]'::jsonb, 1);
rollback to savepoint p8;

\echo '--- 9) tom kurv afvises  → bestilling_linjer_ok'
savepoint p9;
insert into public.bestillinger (reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values ('PROEVE-6', 'Prøve Prøvesen', '28871343', current_date + 3, '12:00', '[]'::jsonb, 1);
rollback to savepoint p9;

\echo '--- 10) ugyldigt telefonnummer afvises  → bestilling_telefon_ok'
savepoint p10;
insert into public.bestillinger (reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values ('PROEVE-7', 'Prøve Prøvesen', '12', current_date + 3, '14:00',
        '[{"navn":"x","antal":1}]'::jsonb, 1);
rollback to savepoint p10;

\echo '--- 11) navn på ét tegn afvises  → bestilling_navn_ok'
savepoint p11;
insert into public.bestillinger (reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values ('PROEVE-8', 'M', '28871343', current_date + 3, '15:00',
        '[{"navn":"x","antal":1}]'::jsonb, 1);
rollback to savepoint p11;

reset role;

\echo ''
\echo '=== SOM CHEF ==='
set local role authenticated;
set local request.jwt.claims = '{"email":"proeve@eksempel.dk"}';

\echo '--- 12) må læse  → 1'
select count(*) as "chefen ser" from public.bestillinger;

\echo '--- 13) må rette status og skrive note  → UPDATE 1'
update public.bestillinger set status = 'bekraeftet', intern_note = 'ringet og aftalt'
 where reference = 'PROEVE-1';

select reference, status, intern_note, antal from public.bestillinger;

reset role;

\echo ''
\echo '=== SOM EN ANDEN INDLOGGET (ikke chef) ==='
set local role authenticated;
set local request.jwt.claims = '{"email":"en-helt-anden@eksempel.dk"}';

\echo '--- 14) må ikke læse andres bestillinger  → 0'
select count(*) as "en fremmed ser" from public.bestillinger;

reset role;

-- Alt rulles tilbage: både prøverækkerne og den midlertidige
-- is_admin(). Databasen står som før.
rollback;

\echo ''
\echo 'Prøven er rullet tilbage. Der står intet nyt i databasen.'
