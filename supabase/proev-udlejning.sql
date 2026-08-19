-- ============================================================
--  PRØVE AF UDLEJNINGEN  (fase 5)
--  ------------------------------------------------------------
--  Kør EFTER udlejning.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og hele rapporten kommer til sidst som én "fejl" —
--  det er IKKE en fejl i databasen, det er den ene kanal
--  Supabases SQL Editor altid viser, og afbrydelsen er samtidig
--  det, der ruller prøvens data tilbage. Filen efterlader
--  ingenting.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Udover det sædvanlige — gæsten må skrive men ikke læse, og
--  forretning A må ikke se B's kunder — beviser filen FASENS
--  EGEN regel: lokalet er ET lokale. Ti må gerne SPØRGE om den
--  samme lørdag, men kun én kan få JA, og et nej til det første
--  ja skal frigive dagen igen. Det er prøve 22-25, og de er de
--  vigtigste i filen: fejler de, står to selskaber i samme rum.
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

-- Et udlejningsønske hos hver. Uden dem rammer "chef A ser IKKE
-- B's" nul rækker og består i en tom database uden nogen regel.
insert into public.udlejninger
  (lokation_id, reference, navn, telefon, dato, antal_personer, besked)
values
  ('proev-a', 'PROEV-UA1', 'Anna hos A', '11111111', current_date + 3, 30, 'Rund fødselsdag'),
  ('proev-b', 'PROEV-UB1', 'Bent hos B', '22222222', current_date + 5, 20, null);

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
  '1. Chef A ser sit eget udlejningsønske',
  (select count(*) = 1 from public.udlejninger where lokation_id = 'proev-a'));

select pg_temp.svar(
  '2. Chef A ser IKKE forretning B''s udlejninger',
  (select count(*) = 0 from public.udlejninger where lokation_id = 'proev-b'));

set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';

select pg_temp.svar(
  '3. Chef B ser sit eget udlejningsønske',
  (select count(*) = 1 from public.udlejninger where lokation_id = 'proev-b'));

select pg_temp.svar(
  '4. Chef B ser IKKE forretning A''s udlejninger',
  (select count(*) = 0 from public.udlejninger where lokation_id = 'proev-a'));

-- =============== 2) SKRIVNING PÅ TVÆRS ======================
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

do $$
declare gik boolean := false;
begin
  begin
    update public.udlejninger set status = 'afvist' where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('5. Chef A kan ikke afvise forretning B''s udlejning', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.udlejninger where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('6. Chef A kan ikke slette forretning B''s udlejning', not gik);
end $$;

-- =============== 3) SIT EGET MÅ MAN GERNE ===================
do $$
declare gik boolean := false;
begin
  begin
    update public.udlejninger
       set status = 'bekraeftet', intern_note = 'depositum aftalt'
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
  '8. En gæst kan ikke læse udlejninger overhovedet',
  (select count(*) = 0 from public.udlejninger));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger
      (lokation_id, reference, navn, telefon, dato, antal_personer, besked)
    values ('proev-a', 'PROEV-UG1', 'Gæst', '33333333',
            current_date + 7, 25, 'Konfirmation');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('9. En gæst KAN sende et udlejningsønske', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger
      (lokation_id, reference, navn, telefon, dato, status)
    values ('proev-a', 'PROEV-UG2', 'Gæst', '34333333', current_date + 8, 'bekraeftet');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('10. En gæst kan ikke sende noget, der ser bekræftet ud', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger
      (lokation_id, reference, navn, telefon, dato, intern_note)
    values ('proev-a', 'PROEV-UG3', 'Gæst', '35333333', current_date + 9, 'skrevet af gæsten');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('11. En gæst kan ikke skrive i personalets note', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.udlejninger set status = 'bekraeftet' where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('12. En gæst kan ikke rette en udlejning', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.udlejninger where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('13. En gæst kan ikke slette en udlejning', not gik);
end $$;

-- =============== 5) LOKALET LEJES PR. DAG ===================
do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, antal_personer)
    values ('proev-a', 'PROEV-UU1', 'Gæst', '12121212', 20);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('14. Et ønske uden dato bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UU2', 'Gæst', '12121212', current_date - 30);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('15. En dato, der er gået, bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UU3', 'Gæst', '12121212', current_date + 1000);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('16. En dato mere end to år frem bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato, antal_personer)
    values ('proev-a', 'PROEV-UU4', 'Gæst', '12121212', current_date + 14, 0);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('17. Nul personer bliver afvist', not gik);
end $$;

/* Antallet er FRIVILLIGT — "vi ved ikke, hvor mange vi bliver"
   er et helt rigtigt ønske, og personalet spørger i telefonen. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UU5', 'Uden antal', '12121212', current_date + 14);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('18. Et ønske UDEN antal er tilladt', gik);
end $$;

-- =============== 6) DOBBELTTRYK OG BREMSE ===================
/* Den første står UDEN FOR en exception-blok: en begin/exception
   i PL/pgSQL er en undertransaktion, og fanges en fejl, rulles
   alt i blokken tilbage — også det, der lykkedes før fejlen. Den
   fælde har kostet en runde før (se proev-forespoergsler.sql). */
insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
values ('proev-a', 'PROEV-UR1', 'Gæst', '44444444', current_date + 40);

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UR2', 'Gæst', '44444444', current_date + 40);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('19. Det samme ønske to gange bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UR3', 'Gæst', '44444444', current_date + 50);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('20. Samme nummer må gerne ønske en ANDEN dag', gik);
end $$;

/* Bremsen tæller RÆKKER, ikke forsøg: UR2 blev afvist og tæller
   ikke. Nummeret har to rækker nu, og grænsen er 2 i døgnet —
   man lejer ét lokale til én fest. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UR4', 'Gæst', '44444444', current_date + 60);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('21. Det tredje fra samme nummer bliver bremset', not gik);
end $$;

-- =============== 7) FASENS EGEN REGEL: ÉT JA PR. DAG ========
/* Chef A bekræftede sin udlejning i prøve 7 — dagen D+3 er taget.
   Ti må gerne SPØRGE om den; kun ét ja kan findes. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UE1', 'Gæst nummer to', '55555555', current_date + 3);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('22. Flere må gerne SPØRGE om en dag, der er taget', gik);
end $$;

set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

do $$
declare gik boolean := false;
begin
  begin
    update public.udlejninger set status = 'bekraeftet' where telefon = '55555555';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('23. Men NUMMER TO kan ikke få ja til en taget dag', not gik);
end $$;

/* Et nej frigiver dagen: afvises det første ja, kan det andet få
   ja. Uden den her kunne en aflysning aldrig genudlejes. */
do $$
declare gik boolean := false;
begin
  update public.udlejninger set status = 'afvist' where telefon = '11111111';
  begin
    update public.udlejninger set status = 'bekraeftet' where telefon = '55555555';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('24. Afvises det første ja, kan det andet få ja', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.udlejninger set status = 'bekraeftet' where telefon = '12121212';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('25. To ja''er på hver sin dag må gerne findes', gik);
end $$;

-- =============== 8) NÅR HELE HAVNEN VIL LEJE ================
/* 10 pr. forretning pr. time. Forretning A har 6 rækker nu:
   Annas, gæstens fra prøve 9, uden-antal fra 18, UR1+UR3 og
   gæst nummer to fra 22. Fylderne lægger 4 til fra to friske
   numre — to pr. nummer, så nummer-bremsen ikke går af — og så
   skal det ellevte afvises. */
set local role anon;
set local request.jwt.claims = '{}';

do $$
declare i int; j int;
begin
  for i in 1..2 loop
    for j in 1..2 loop
      insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
      values ('proev-a', 'PROEV-UF' || i || '-' || j, 'Fylder', '6100000' || i,
              current_date + 70 + i * 10 + j);
    end loop;
  end loop;
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.udlejninger (lokation_id, reference, navn, telefon, dato)
    values ('proev-a', 'PROEV-UR5', 'Gæst', '66666666', current_date + 100);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('26. Det ellevte ønske på en time bliver bremset', not gik);
end $$;

-- =============== 9) EN FREMMED ==============================
set local role authenticated;
set local request.jwt.claims = '{"email":"ingen@fremmed.dk"}';

select pg_temp.svar(
  '27. En indlogget uden adgang ser ingen udlejninger',
  (select count(*) = 0 from public.udlejninger));

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

  raise exception E'\n============ RESULTATET AF UDLEJNINGS-PRØVEN ===============\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 27 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

-- Kun for psql: fejlen ovenfor har allerede rullet alt tilbage i
-- editoren, men en psql-session står i en afbrudt transaktion,
-- og den lukkes pænt her.
rollback;
