-- ============================================================
--  PRØVE AF SKRALDESPANDEN
--  ------------------------------------------------------------
--  Kør EFTER skraldespand.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og hele rapporten kommer til sidst som én "fejl" —
--  det er den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--  Filen efterlader ingenting.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  En skraldespand, der kun skjuler rækken, er værre end ingen
--  skraldespand. Rækken bliver ved med at SPÆRRE: gæsten kan ikke
--  sende den samme bestilling igen, bremsen tæller den med, og en
--  bekræftet udlejning, der er smidt ud, holder dagen optaget for
--  evigt — uden at nogen kan se hvorfor.
--
--  Halvdelen af prøverne herunder handler netop om det: at det,
--  der ligger i spanden, ikke længere står i vejen. Den anden
--  halvdel om, at det stadig ikke er gæstens spand.
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-a', 'Forretning A', 'Vej 1', '2670', 'Greve', '11111111'),
       ('proev-b', 'Forretning B', 'Vej 2', '4600', 'Køge', '22222222')
on conflict (id) do nothing;

insert into public.admin_adgang (email, lokation_id) values
  ('chef-a@proev.dk', 'proev-a'),
  ('chef-b@proev.dk', 'proev-b')
on conflict do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

-- Gæstens bestilling, sendt som gæsten selv ville sende den.
set local role anon;
set local request.jwt.claims = '{}';

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-a', 'SKRALD-1', 'Anna', '11112222', current_date + 2, '12:00',
            '[{"navn":"Smørrebrød","antal":2,"pris":55}]'::jsonb, 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('1. Gæsten kan sende en bestilling', gik);
end $$;

/* Gæsten må ikke selv kunne sende noget, der allerede ligger i
   spanden. En sådan række ville være usynlig i admin OG tælle med
   i bremsen — altså en bestilling, ingen ser, som spærrer for den
   rigtige bagefter. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal, slettet)
    values ('proev-a', 'SKRALD-LUSK', 'Luskeren', '19998888', current_date + 2, '13:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1, now());
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('2. Gæsten kan IKKE sende noget, der allerede er slettet', not gik);
end $$;

-- =============== PERSONALET SMIDER UD =======================
set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set slettet = now() where reference = 'SKRALD-1';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('3. Chef A kan smide en bestilling i skraldespanden', gik);
end $$;

select pg_temp.svar(
  '4. Den ligger i spanden og ikke på listen',
  (select count(*) = 1 from public.bestillinger
    where reference = 'SKRALD-1' and slettet is not null));

-- =============== DEN SPÆRRER IKKE LÆNGERE ===================
/* DEN VIGTIGSTE PRØVE I FILEN. Uden den delvise nøgle på
   (telefon, hent_dato, hent_tid) ville gæsten få "du har
   allerede sendt den her" — på grund af en række, hverken gæsten
   eller personalet kan se. */
set local role anon;
set local request.jwt.claims = '{}';

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-a', 'SKRALD-2', 'Anna', '11112222', current_date + 2, '12:00',
            '[{"navn":"Smørrebrød","antal":2,"pris":55}]'::jsonb, 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar(
    '5. Gæsten kan sende PRÆCIS den samme igen, når den er smidt ud', gik);
end $$;

/* Og nøglen skal stadig virke på det, den er lavet til: to ens
   bestillinger, der begge er levende, er stadig et dobbelttryk. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-a', 'SKRALD-3', 'Anna', '11112222', current_date + 2, '12:00',
            '[{"navn":"Smørrebrød","antal":2,"pris":55}]'::jsonb, 2);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('6. Dobbelttrykket bliver STADIG afvist', not gik);
end $$;

-- =============== BREMSEN TÆLLER KUN DET LEVENDE =============
/* Grænsen er 5 bestillinger pr. nummer i døgnet. Nummeret her
   sender PRÆCIS fem, får dem alle smidt ud, og skal kunne sende
   igen. Talte bremsen spanden med, ville nummeret være spærret
   resten af døgnet uden en eneste synlig bestilling.

   Fem og ikke fire: med fire ville prøven bestå, uanset om
   bremsen tæller spanden med — fire er under grænsen begge veje,
   og en prøve, der ikke kan fejle, måler ingenting. */
do $$
declare i int;
begin
  for i in 1..5 loop
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-a', 'SKRALD-B' || i, 'Bo', '13334444',
            current_date + 3, ('09:' || lpad((i * 10)::text, 2, '0'))::time,
            '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1);
  end loop;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';
update public.bestillinger set slettet = now() where telefon = '13334444';

set local role anon;
set local request.jwt.claims = '{}';

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-a', 'SKRALD-B9', 'Bo', '13334444', current_date + 3, '11:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1);
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('7. Bremsen tæller IKKE det, der ligger i spanden', gik);
end $$;

/* Og bremsen skal stadig bremse. Nummeret har nu én levende
   bestilling; fire mere rammer grænsen på fem. */
do $$
declare gik boolean := true;
begin
  begin
    for i in 1..8 loop
      insert into public.bestillinger
        (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
      values ('proev-a', 'SKRALD-C' || i, 'Bo', '13334444',
              current_date + 4, ('14:' || lpad((i * 5)::text, 2, '0'))::time,
              '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1);
    end loop;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('8. Bremsen bremser STADIG ved fem i døgnet', not gik);
end $$;

-- =============== BAGLOKALET: DAGEN SKAL SLIPPES =============
set local role anon;
set local request.jwt.claims = '{}';

insert into public.udlejninger
  (lokation_id, reference, navn, telefon, dato, antal_personer)
values ('proev-a', 'SKRALD-U1', 'Ulla', '15556666', current_date + 20, 30),
       ('proev-a', 'SKRALD-U2', 'Ove',  '17778888', current_date + 20, 25);

set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

update public.udlejninger set status = 'bekraeftet' where reference = 'SKRALD-U1';

do $$
declare gik boolean := false;
begin
  begin
    update public.udlejninger set status = 'bekraeftet' where reference = 'SKRALD-U2';
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('9. Dagen kan stadig kun gives væk én gang', not gik);
end $$;

/* Her ligger den fælde, filen er skrevet for: en bekræftet
   udlejning, der ryger i spanden, SKAL frigive dagen igen.
   Gjorde den ikke det, ville lokalet være optaget for evigt af
   noget, ingen kan se. */
update public.udlejninger set slettet = now() where reference = 'SKRALD-U1';

do $$
declare gik boolean := false;
begin
  begin
    update public.udlejninger set status = 'bekraeftet' where reference = 'SKRALD-U2';
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar(
    '10. En bekræftet udlejning i spanden frigiver dagen igen', gik);
end $$;

-- =============== FORTRYD, OG SLET FOR ALVOR =================
do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set slettet = null where reference = 'SKRALD-B1';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('11. Chef A kan fortryde og hente bestillingen tilbage', gik);
end $$;

select pg_temp.svar(
  '12. Den er levende igen',
  (select count(*) = 1 from public.bestillinger
    where reference = 'SKRALD-B1' and slettet is null));

/* FORTRYD KAN AFVISES, og det er ikke en fejl.
   SKRALD-1 blev smidt ud, og gæsten sendte derefter præcis den
   samme igen (SKRALD-2). Kom den gamle tilbage nu, ville der stå
   to ens bestillinger på listen — og køkkenet ville lave maden to
   gange. Nøglen siger nej.

   Databasen svarer med "bestilling_ikke_dobbelt". js/store.js
   oversætter det til noget, personalet kan bruge: den samme er
   sendt igen imens. */
do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set slettet = null where reference = 'SKRALD-1';
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar(
    '13. Fortryd afvises, hvis den samme er sendt igen imens', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.bestillinger where reference = 'SKRALD-1';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('14. Chef A kan slette for alvor, når spanden tømmes', gik);
end $$;

-- =============== SPANDEN ER IKKE GÆSTENS ====================
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar(
  '15. En gæst kan ikke læse skraldespanden',
  (select count(*) = 0 from public.bestillinger where slettet is not null));

do $$
declare gik boolean := false;
begin
  begin
    delete from public.bestillinger where slettet is not null;
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('16. En gæst kan ikke tømme skraldespanden', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set slettet = now();
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('17. En gæst kan ikke smide andres bestillinger ud', not gik);
end $$;

-- =============== OG IKKE HINANDENS ==========================
set local role authenticated;
set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';

select pg_temp.svar(
  '18. Chef B ser ikke forretning A''s skraldespand',
  (select count(*) = 0 from public.bestillinger
    where lokation_id = 'proev-a' and slettet is not null));

do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set slettet = null
     where lokation_id = 'proev-a' and slettet is not null;
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('19. Chef B kan ikke fortryde i forretning A''s spand', not gik);
end $$;

-- ------------------------------------------------------------
--  RAPPORTEN — afbrydelsen ER oprydningen.
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

  raise exception E'\n======= RESULTATET AF SKRALDESPANDS-PRØVEN =================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 19 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

-- Kun for psql: lukker den afbrudte transaktion pænt.
rollback;
