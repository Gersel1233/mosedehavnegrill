-- ============================================================
--  PRØVE AF BORDBESTILLINGERNE  (fase 4)
--  ------------------------------------------------------------
--  Kør EFTER borde.sql. Hver prøve skriver BESTOD eller FEJLEDE,
--  og hele rapporten kommer til sidst som én "fejl" — det er IKKE
--  en fejl i databasen, det er den ene kanal Supabases SQL Editor
--  altid viser, og afbrydelsen er samtidig det, der ruller
--  prøvens data tilbage. Filen efterlader ingenting.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Et bordønske er navn og telefonnummer på et menneske, der har
--  fortalt, hvornår de går ud og spiser — altså også hvornår de
--  ikke er hjemme. Kan forretning A læse forretning B's, er det
--  en lækage mellem to kunder. Derfor er prøve 2 og 4 de
--  vigtigste i filen.
--
--  Den prøver også det, en formular ikke kan bevise: at gæsten
--  ikke kan sætte sin egen status ("ser bekræftet ud"), og at
--  gæsten ikke kan skrive i personalets note. Begge dele kan
--  gøres med to linjer i en browserkonsol, og begge dele skal
--  derfor afvises af databasen — ikke af JavaScript.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES?
--  ------------------------------------------------------------
--  Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

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

-- Et bordønske hos hver. Uden dem rammer "chef A ser IKKE B's"
-- nul rækker og består i en tom database, hvor ingen regel var.
insert into public.bordbestillinger
  (lokation_id, reference, navn, telefon, dato, tid, antal_personer, besked)
values
  ('proev-a', 'PROEV-BA1', 'Anna hos A', '11111111',
   current_date + 3, '18:00', 4, 'Vinduesplads hvis muligt'),
  ('proev-b', 'PROEV-BB1', 'Bent hos B', '22222222',
   current_date + 5, '12:00', 2, null);

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
  '1. Chef A ser sit eget bordønske',
  (select count(*) = 1 from public.bordbestillinger where lokation_id = 'proev-a'));

select pg_temp.svar(
  '2. Chef A ser IKKE forretning B''s bordønsker',
  (select count(*) = 0 from public.bordbestillinger where lokation_id = 'proev-b'));

set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';

select pg_temp.svar(
  '3. Chef B ser sit eget bordønske',
  (select count(*) = 1 from public.bordbestillinger where lokation_id = 'proev-b'));

select pg_temp.svar(
  '4. Chef B ser IKKE forretning A''s bordønsker',
  (select count(*) = 0 from public.bordbestillinger where lokation_id = 'proev-a'));

-- =============== 2) SKRIVNING PÅ TVÆRS ======================
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

do $$
declare gik boolean := false;
begin
  begin
    update public.bordbestillinger set status = 'afvist' where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('5. Chef A kan ikke afvise forretning B''s bordønske', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.bordbestillinger where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('6. Chef A kan ikke slette forretning B''s bordønske', not gik);
end $$;

-- =============== 3) SIT EGET MÅ MAN GERNE ===================
do $$
declare gik boolean := false;
begin
  begin
    update public.bordbestillinger
       set status = 'bekraeftet', intern_note = 'bord 4 ved vinduet'
     where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('7. Chef A KAN bekræfte og skrive sin note', gik);
end $$;

-- =============== 4) GÆSTEN ==================================
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar(
  '8. En gæst kan ikke læse bordønsker overhovedet',
  (select count(*) = 0 from public.bordbestillinger));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger
      (lokation_id, reference, navn, telefon, dato, tid, antal_personer, besked)
    values ('proev-a', 'PROEV-BG1', 'Gæst', '33333333',
            current_date + 7, '19:00', 6, 'Barnestol til den mindste');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('9. En gæst KAN sende et bordønske', gik);
end $$;

/* De to herunder kan ikke prøves i en browser. Formularen sender
   hverken status eller note — men en browserkonsol kan, og så er
   det databasen, der er den eneste, der siger nej. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger
      (lokation_id, reference, navn, telefon, dato, tid, antal_personer, status)
    values ('proev-a', 'PROEV-BG2', 'Gæst', '34333333',
            current_date + 7, '19:00', 2, 'bekraeftet');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('10. En gæst kan ikke sende noget, der ser bekræftet ud', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger
      (lokation_id, reference, navn, telefon, dato, tid, antal_personer, intern_note)
    values ('proev-a', 'PROEV-BG3', 'Gæst', '35333333',
            current_date + 7, '19:00', 2, 'skrevet af gæsten');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('11. En gæst kan ikke skrive i personalets note', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.bordbestillinger set status = 'bekraeftet' where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('12. En gæst kan ikke rette et bordønske', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.bordbestillinger where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('13. En gæst kan ikke slette et bordønske', not gik);
end $$;

-- =============== 5) ET BORD ER DATO, TID OG ANTAL ===========
/* Forespørgslerne har dato og antal som frivillige — her er de
   påkrævede, og prøverne findes, så den forskel ikke kan skride:
   et bordønske uden klokkeslæt er ikke noget, personalet kan
   svare på. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, tid, antal_personer)
    values ('proev-a', 'PROEV-BU1', 'Gæst', '12121212', '18:00', 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('14. Et bord uden dato bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, antal_personer)
    values ('proev-a', 'PROEV-BU2', 'Gæst', '12121212', current_date + 7, 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('15. Et bord uden klokkeslæt bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid)
    values ('proev-a', 'PROEV-BU3', 'Gæst', '12121212', current_date + 7, '18:00');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('16. Et bord uden antal bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BU4', 'Gæst', '12121212', current_date - 30, '18:00', 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('17. En dato, der er gået, bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BU5', 'Gæst', '12121212', current_date + 365, '18:00', 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('18. En dato mere end 120 dage frem bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BU6', 'Gæst', '12121212', current_date + 7, '18:00', 0);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('19. Nul personer bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BU7', 'Gæst', '12121212', current_date + 7, '18:00', 101);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('20. Hundrede og én er et selskab, ikke et bord', not gik);
end $$;

-- =============== 6) DOBBELTTRYK OG BREMSE ===================
/* Den første står UDEN FOR en exception-blok, og det er ikke
   pynt: en begin/exception i PL/pgSQL er en undertransaktion, og
   fanges en fejl, rulles alt i blokken tilbage — også det, der
   lykkedes før fejlen. Den fælde har kostet en runde før (se
   proev-forespoergsler.sql). */
insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
values ('proev-a', 'PROEV-BR1', 'Gæst', '44444444', current_date + 10, '18:00', 4);

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BR2', 'Gæst', '44444444', current_date + 10, '18:00', 4);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('21. Det samme ønske to gange bliver afvist', not gik);
end $$;

/* Samme nummer, samme dag, andet klokkeslæt er en RIGTIG ændring
   — gæsten har ombestemt sig. En bremse, der afviser den, er ikke
   sikkerhed; det er en gæst, der ringer og spørger, hvorfor siden
   ikke virker. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BR3', 'Gæst', '44444444', current_date + 10, '19:30', 4);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('22. Samme nummer må gerne ønske et andet tidspunkt', gik);
end $$;

/* Bremsen tæller RÆKKER, ikke forsøg: BR2 blev afvist og tæller
   ikke. Nummeret har to rækker (BR1, BR3), så den tredje skal
   stadig gå igennem — og først den fjerde bremses. En prøve, der
   kun måler den ene side, kan bestå med grænsen et andet sted. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BR4', 'Gæst', '44444444', current_date + 20, '18:00', 4);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('23. Tre ønsker fra samme nummer går igennem', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BR5', 'Gæst', '44444444', current_date + 30, '18:00', 4);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('24. Det fjerde fra samme nummer bliver bremset', not gik);
end $$;

-- =============== 7) NÅR HELE HAVNEN VIL HAVE BORD ===========
/* 20 pr. forretning pr. time. Forretning A har 5 rækker nu: Annas,
   gæstens fra prøve 9, og BR1+BR3+BR4. Fylderne herunder lægger 15
   til fra fem friske numre — tre pr. nummer, så nummer-bremsen
   ikke går af undervejs — og så skal det enogtyvende afvises. */
do $$
declare i int; j int;
begin
  for i in 1..5 loop
    for j in 1..3 loop
      insert into public.bordbestillinger
        (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
      values ('proev-a', 'PROEV-BF' || i || '-' || j, 'Fylder', '5100000' || i,
              current_date + 40 + j, ('1' || (5 + j) || ':00')::time, 2);
    end loop;
  end loop;
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bordbestillinger (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-a', 'PROEV-BR6', 'Gæst', '66666666', current_date + 50, '18:00', 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('25. Det enogtyvende ønske på en time bliver bremset', not gik);
end $$;

-- =============== 8) EN FREMMED ==============================
set local role authenticated;
set local request.jwt.claims = '{"email":"ingen@fremmed.dk"}';

select pg_temp.svar(
  '26. En indlogget uden adgang ser ingen bordønsker',
  (select count(*) = 0 from public.bordbestillinger));

-- ------------------------------------------------------------
--  RAPPORTEN. Den standser med vilje kørslen med en fejl, så
--  resultatet kan læses FØR tilbagerulningen — og afbrydelsen er
--  samtidig det, der rydder prøvens data væk igen. Den røde farve
--  er ikke en fejl i databasen: den ER prøvens oprydning.
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

  raise exception E'\n============ RESULTATET AF BORD-PRØVEN =====================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 26 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

-- Kun for psql: fejlen ovenfor har allerede rullet alt tilbage i
-- editoren, men en psql-session står i en afbrudt transaktion,
-- og den lukkes pænt her.
rollback;
