-- ============================================================
--  PRØVE AF FORESPØRGSLERNE  (fase 2)
--  ------------------------------------------------------------
--  Kør EFTER forespoergsler.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og hele rapporten kommer til sidst som én "fejl" —
--  det er IKKE en fejl i databasen, det er den ene kanal
--  Supabases SQL Editor altid viser, og afbrydelsen er samtidig
--  det, der ruller prøvens data tilbage. Filen efterlader
--  ingenting.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  En forespørgsel er navn og telefonnummer på et menneske, der
--  har fortalt, hvornår de holder fest — altså også hvornår de
--  ikke er hjemme. Kan forretning A læse forretning B's, er det
--  ikke en fejl i en funktion; det er en lækage mellem to kunder,
--  der ikke kender hinanden. Derfor er prøve 2 og 4 de vigtigste
--  i filen.
--
--  Den prøver også de to ting, en formular ikke kan bevise: at
--  gæsten ikke kan sætte sin egen status, og at gæsten ikke kan
--  skrive i personalets note. Begge dele kan gøres med to linjer
--  i en browserkonsol, og begge dele skal derfor afvises af
--  databasen — ikke af JavaScript.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES?
--  ------------------------------------------------------------
--  Supabase giver selv anon og authenticated adgang til tabeller
--  og sekvenser. Gør du det ikke, fejler prøverne med
--  "permission denied" — og det ligner en fejl i adgangsreglerne
--  uden at være det. Kør først:
--
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

-- Resultaterne samles i indstillingen proev.rapport og læses op
-- samlet til sidst. Se supabase/proev-flerlejer.sql for hvorfor
-- det ikke er en midlertidig tabel.

-- ------------------------------------------------------------
--  Opsætning: to forretninger, to chefer
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-a', 'Forretning A', 'Vej 1', '2670', 'Greve', '11111111'),
       ('proev-b', 'Forretning B', 'Vej 2', '4600', 'Køge', '22222222')
on conflict (id) do nothing;

insert into public.admin_adgang (email, lokation_id) values
  ('chef-a@proev.dk', 'proev-a'),
  ('chef-b@proev.dk', 'proev-b')
on conflict do nothing;

-- En forespørgsel hos hver. De to er hele pointen: uden dem
-- rammer "chef A ser IKKE B's" nul rækker og består i en tom
-- database, hvor der slet ingen regel var.
insert into public.forespoergsler
  (lokation_id, reference, type, navn, telefon, dato, antal_personer, besked)
values
  ('proev-a', 'PROEV-FA1', 'selskab', 'Anna hos A', '11111111',
   current_date + 30, 24, 'Sølvbryllup'),
  ('proev-b', 'PROEV-FB1', 'catering', 'Bent hos B', '22222222',
   current_date + 40, 50, 'Firmafrokost');

-- ------------------------------------------------------------
--  Hjælper: skriv BESTOD/FEJLEDE, og gem linjen til rapporten
-- ------------------------------------------------------------
create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

set local role authenticated;

-- =============== 1) DEN VIGTIGSTE ===========================
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

select pg_temp.svar(
  '1. Chef A ser sin egen forespørgsel',
  (select count(*) = 1 from public.forespoergsler where lokation_id = 'proev-a'));

select pg_temp.svar(
  '2. Chef A ser IKKE forretning B''s forespørgsler',
  (select count(*) = 0 from public.forespoergsler where lokation_id = 'proev-b'));

set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';

select pg_temp.svar(
  '3. Chef B ser sin egen forespørgsel',
  (select count(*) = 1 from public.forespoergsler where lokation_id = 'proev-b'));

select pg_temp.svar(
  '4. Chef B ser IKKE forretning A''s forespørgsler',
  (select count(*) = 0 from public.forespoergsler where lokation_id = 'proev-a'));

-- =============== 2) SKRIVNING PÅ TVÆRS ======================
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

do $$
declare gik boolean := false;
begin
  begin
    update public.forespoergsler set status = 'afvist' where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('5. Chef A kan ikke afvise forretning B''s forespørgsel', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.forespoergsler where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('6. Chef A kan ikke slette forretning B''s forespørgsel', not gik);
end $$;

-- =============== 3) SIT EGET MÅ MAN GERNE ===================
do $$
declare gik boolean := false;
begin
  begin
    update public.forespoergsler
       set status = 'kontaktet', intern_note = 'ringet, vender tilbage'
     where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('7. Chef A KAN ringe op og skrive sin note', gik);
end $$;

-- =============== 4) GÆSTEN ==================================
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar(
  '8. En gæst kan ikke læse forespørgsler overhovedet',
  (select count(*) = 0 from public.forespoergsler));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler
      (lokation_id, reference, type, navn, telefon, dato, antal_personer, besked)
    values ('proev-a', 'PROEV-G1', 'selskab', 'Gæst', '33333333',
            current_date + 60, 30, 'Fødselsdag');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('9. En gæst KAN sende en forespørgsel', gik);
end $$;

/* De to herunder kan ikke prøves i en browser. Formularen sender
   hverken status eller note — men en browserkonsol kan, og så er
   det databasen, der er den eneste, der siger nej. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler
      (lokation_id, reference, type, navn, telefon, status)
    values ('proev-a', 'PROEV-G2', 'selskab', 'Gæst', '34333333', 'aftalt');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('10. En gæst kan ikke sende noget, der ser aftalt ud', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler
      (lokation_id, reference, type, navn, telefon, intern_note)
    values ('proev-a', 'PROEV-G3', 'selskab', 'Gæst', '35333333', 'skrevet af gæsten');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('11. En gæst kan ikke skrive i personalets note', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.forespoergsler set status = 'aftalt' where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('12. En gæst kan ikke rette en forespørgsel', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.forespoergsler where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('13. En gæst kan ikke slette en forespørgsel', not gik);
end $$;

-- =============== 5) DE TRE INDGANGE =========================
/* Listen står to steder: check-reglen her og FORESPOERGSEL_TYPER
   i js/store.js. Prøven herunder findes for at fange den dag, kun
   det ene bliver rettet — en fjerde type i formularen, som
   databasen afviser, giver en gæst der trykker send og får en
   fejl, ingen forstår. */
do $$
declare gik boolean := true;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon)
    values ('proev-a', 'PROEV-T1', 'catering',  'Gæst', '66666666'),
           ('proev-a', 'PROEV-T2', 'baglokale', 'Gæst', '66666666'),
           ('proev-a', 'PROEV-T3', 'selskab',   'Gæst', '66666666');
  exception when others then gik := false;
  end;
  perform pg_temp.svar('14. Alle tre indgange bliver taget imod', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon)
    values ('proev-a', 'PROEV-T4', 'bryllupsplanlaegning', 'Gæst', '99999999');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('15. En type, der ikke findes, bliver afvist', not gik);
end $$;

-- =============== 6) DE FRIVILLIGE FELTER ====================
do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon, besked)
    values ('proev-a', 'PROEV-U1', 'selskab', 'Uden dato', '12121212',
            'Vi ved ikke datoen endnu');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('16. En forespørgsel UDEN dato og antal er tilladt', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon, dato)
    values ('proev-a', 'PROEV-U2', 'selskab', 'Gæst', '13131313', current_date - 30);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('17. En dato, der er gået, bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon)
    values ('proev-a', 'PROEV-U3', 'selskab', 'Gæst', '123');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('18. Et for kort telefonnummer bliver afvist', not gik);
end $$;

-- =============== 7) BREMSEN =================================
/* Fra forespoergsler.sql. Tallene er lavere end bestillingernes,
   fordi man spørger om ét selskab og ikke om frokost hver
   torsdag: 3 pr. nummer i døgnet, og det samme spørgsmål to gange
   inden for ti minutter er et dobbelttryk. */
/* Den første står UDEN FOR en exception-blok, og det er ikke
   pynt. En begin/exception i PL/pgSQL er en UNDERTRANSAKTION:
   fanges en fejl, rulles alt inde i blokken tilbage — også det,
   der lykkedes før fejlen.

   Første udgave lagde begge indstik i samme blok. Nummeret endte
   derfor med NUL rækker i stedet for én, tællingen længere nede
   var én for lav hele vejen, og prøve 22 sagde at bremsen ikke
   virkede. Den gjorde den. Det var målingen, der talte forkert. */
insert into public.forespoergsler (lokation_id, reference, type, navn, telefon, dato)
values ('proev-a', 'PROEV-R1', 'selskab', 'Gæst', '44444444', current_date + 90);

do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon, dato)
    values ('proev-a', 'PROEV-R2', 'selskab', 'Gæst', '44444444', current_date + 90);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('19. Det samme spørgsmål to gange bliver afvist', not gik);
end $$;

/* Dobbelttrykket må ikke spærre for et RIGTIGT nyt spørgsmål.
   Samme nummer, samme type, men en anden dato er en ny fest — og
   en bremse, der afviser den, er ikke sikkerhed, det er en gæst,
   der ringer og spørger, hvorfor siden ikke virker. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon, dato)
    values ('proev-a', 'PROEV-R3', 'selskab', 'Gæst', '44444444', current_date + 120);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('20. Samme nummer må gerne spørge om en ANDEN dato', gik);
end $$;

/* Grænsen måles fra BEGGE sider, og den skelnen kostede en runde:
   bremsen tæller RÆKKER, ikke forsøg. Nummeret har to rækker nu
   (R1 og R3) — R2 blev afvist som dobbelttryk og tæller altså
   ikke med. Den tredje skal derfor stadig gå igennem, og først
   den fjerde bliver bremset. En prøve, der kun måler den ene
   side, kan bestå med grænsen sat et helt andet sted. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon, dato)
    values ('proev-a', 'PROEV-R4', 'selskab', 'Gæst', '44444444', current_date + 150);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('21. Tre forespørgsler fra samme nummer går igennem', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.forespoergsler (lokation_id, reference, type, navn, telefon, dato)
    values ('proev-a', 'PROEV-R5', 'selskab', 'Gæst', '44444444', current_date + 180);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('22. Den fjerde fra samme nummer bliver bremset', not gik);
end $$;

-- =============== 8) EN FREMMED ==============================
set local role authenticated;
set local request.jwt.claims = '{"email":"ingen@fremmed.dk"}';

select pg_temp.svar(
  '23. En indlogget uden adgang ser ingen forespørgsler',
  (select count(*) = 0 from public.forespoergsler));

-- ------------------------------------------------------------
--  RAPPORTEN. Den standser med vilje kørslen med en fejl, så
--  resultatet kan læses FØR tilbagerulningen — og afbrydelsen er
--  samtidig det, der rydder prøvens data væk igen. Den røde farve
--  er ikke en fejl i databasen: den ER prøvens oprydning.
--
--  Står der FEJLEDE nogen steder, skal det rettes FØR siden tager
--  imod den første rigtige forespørgsel.
-- ------------------------------------------------------------
do $$
declare
  rapport text := rtrim(coalesce(current_setting('proev.rapport', true), ''), E'\n');
  linjer  text[] := case when rapport = '' then '{}'::text[]
                         else string_to_array(rapport, E'\n') end;
  antal   int := coalesce(array_length(linjer, 1), 0);
  fejl    int;
begin
  select count(*) into fejl from unnest(linjer) as l where l like 'FEJLEDE%';

  raise exception E'\n============ RESULTATET AF FORESPØRGSELS-PRØVEN ============\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 23 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

-- Kun for psql: fejlen ovenfor har allerede rullet alt tilbage i
-- editoren, men en psql-session står i en afbrudt transaktion,
-- og den lukkes pænt her.
rollback;
