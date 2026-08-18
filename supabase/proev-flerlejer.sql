-- ============================================================
--  PRØVE AF FLERLEJER-ADGANGEN
--  ------------------------------------------------------------
--  Kør EFTER setup.sql og flerlejer.sql. Hver linje skriver
--  BESTOD eller FEJLEDE, og filen ruller sig selv tilbage til
--  sidst — den efterlader ingenting.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Med én forretning i databasen var spørgsmålet "må du læse
--  bestillinger". Med to er det "må du læse DEN HER forretnings
--  bestillinger", og forskellen kan man ikke se på skærmen.
--
--  En bestilling er navn og telefonnummer på et menneske. Kan
--  forretning A læse forretning B's, er det ikke en fejl i en
--  funktion — det er en lækage af persondata mellem to kunder der
--  ikke kender hinanden. Derfor står prøven her, og derfor er den
--  første prøve nedenfor den vigtigste i hele projektet.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES?
--  ------------------------------------------------------------
--  Supabase giver selv rollerne anon og authenticated adgang til
--  tabeller OG sekvenser. Gør du det ikke, fejler prøve 10 og 15
--  med "permission denied for sequence ..." — og det ligner en
--  fejl i adgangsreglerne, men er det ikke. Kør først:
--
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
--
--  På det rigtige Supabase-projekt skal du ingenting.
-- ============================================================

-- Her stod engang to \-kommandoer (\set og \pset). De hører til
-- psql, terminalværktøjet prøven blev udviklet med, og Supabases
-- SQL Editor taler kun SQL: den fældede hele arket med en
-- syntaksfejl på linjen, før én eneste prøve var kørt. De var
-- kun pynt for psql — herinde skal der ingenting til i stedet.

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

/* Et menukort hos hver.

   De her rækker er ikke pynt. Uden dem rammer prøve 5 og 19
   ("kan chef A rette forretning B's menukort", "kan en gæst
   ændre priser") nul rækker, og en update der ikke rammer noget
   sætter found = false — præcis som en update adgangsreglen har
   afvist. Prøverne ville altså bestå i en tom database, hvor der
   slet ingen regel var. En prøve der ikke kan fejle, måler
   ingenting. */
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering, aktiv)
values ('proev-a', 'mad', 'Prøvekategori A', 1, true),
       ('proev-b', 'mad', 'Prøvekategori B', 1, true);

insert into public.menu_varer (kategori_id, navn, pris, sortering, aktiv)
select k.id, 'Prøvevare hos ' || k.lokation_id, 55, 1, true
  from public.menu_kategorier k
 where k.lokation_id in ('proev-a', 'proev-b');

-- En bestilling hos hver
insert into public.bestillinger
  (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values
  ('proev-a', 'PROEV-A1', 'Anna hos A', '11111111', current_date + 2, '12:00',
   '[{"navn":"Smørrebrød","antal":2,"pris":55}]'::jsonb, 2),
  ('proev-b', 'PROEV-B1', 'Bent hos B', '22222222', current_date + 2, '12:00',
   '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1);

-- ------------------------------------------------------------
--  Hjælper: skriv BESTOD/FEJLEDE i stedet for bare et tal
-- ------------------------------------------------------------
create or replace function pg_temp.svar(navn text, ok boolean) returns text
language sql as $$
  select case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
$$;

-- ------------------------------------------------------------
--  Rollen skiftes til den indloggede bruger. anon og
--  authenticated er de to Supabase bruger til gæst og indlogget.
-- ------------------------------------------------------------
set local role authenticated;

-- =============== 1) DEN VIGTIGSTE ===========================
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

select pg_temp.svar(
  '1. Chef A ser sin egen bestilling',
  (select count(*) = 1 from public.bestillinger where lokation_id = 'proev-a'));

select pg_temp.svar(
  '2. Chef A ser IKKE forretning B''s bestillinger',
  (select count(*) = 0 from public.bestillinger where lokation_id = 'proev-b'));

set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';

select pg_temp.svar(
  '3. Chef B ser sin egen bestilling',
  (select count(*) = 1 from public.bestillinger where lokation_id = 'proev-b'));

select pg_temp.svar(
  '4. Chef B ser IKKE forretning A''s bestillinger',
  (select count(*) = 0 from public.bestillinger where lokation_id = 'proev-a'));

-- =============== 2) SKRIVNING PÅ TVÆRS ======================
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

do $$
declare gik boolean := false;
begin
  begin
    update public.menu_kategorier set navn = 'Kapret' where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'FEJLEDE  ' else 'BESTOD   ' end
    || '5. Chef A kan ikke rette forretning B''s menukort';
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.indstillinger (lokation_id, noegle, vaerdi)
    values ('proev-b', 'kapret', '"ja"'::jsonb);
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'FEJLEDE  ' else 'BESTOD   ' end
    || '6. Chef A kan ikke skrive i forretning B''s indstillinger';
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.bestillinger where lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'FEJLEDE  ' else 'BESTOD   ' end
    || '7. Chef A kan ikke slette forretning B''s bestillinger';
end $$;

-- =============== 3) SIT EGET MÅ MAN GERNE ===================
do $$
declare gik boolean := false;
begin
  begin
    insert into public.indstillinger (lokation_id, noegle, vaerdi)
    values ('proev-a', 'proev_noegle', '"ja"'::jsonb);
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'BESTOD   ' else 'FEJLEDE  ' end
    || '8. Chef A KAN skrive i sine egne indstillinger';
end $$;

-- Den samme nøgle hos to forretninger må ikke støde sammen. Det
-- var hele grunden til at primærnøglen blev (lokation_id, noegle).
set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';
do $$
declare gik boolean := false;
begin
  begin
    insert into public.indstillinger (lokation_id, noegle, vaerdi)
    values ('proev-b', 'proev_noegle', '"også ja"'::jsonb);
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'BESTOD   ' else 'FEJLEDE  ' end
    || '9. Begge forretninger kan have SAMME nøgle i indstillinger';
end $$;

-- =============== 3b) DE VEJE ADMIN FAKTISK SKRIVER AD =======
--  Alt ovenfor prøver reglerne direkte. Herunder prøves de
--  skrivninger js/store.js rent faktisk sender, i den form den
--  sender dem. En regel der er rigtig, men som admin ikke kan
--  komme igennem, er lige så ubrugelig som ingen regel.
-- ------------------------------------------------------------
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

/* store.js sender IKKE lokation_id på en ny vare. Kolonnen er
   not null, så det holder kun fordi udløseren menu_vare_lokation
   henter den fra kategorien først. Rækkefølgen — udløser før
   adgangsreglens with check — er ikke noget vi kan læse os til
   med sikkerhed. Så måler vi den. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.menu_varer (kategori_id, navn, pris, sortering, aktiv)
    select k.id, 'Ny vare uden lokation', 42, 9, true
      from public.menu_kategorier k where k.lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'BESTOD   ' else 'FEJLEDE  ' end
    || '10. Admin kan oprette en vare UDEN selv at sende lokation_id';
end $$;

select pg_temp.svar(
  '11. Den nye vare arvede kategoriens lokation',
  (select count(*) = 1 from public.menu_varer
    where navn = 'Ny vare uden lokation' and lokation_id = 'proev-a'));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.menu_varer (kategori_id, navn, pris, sortering, aktiv)
    select k.id, 'Kapret vare', 42, 9, true
      from public.menu_kategorier k where k.lokation_id = 'proev-b';
    gik := found;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'FEJLEDE  ' else 'BESTOD   ' end
    || '12. Chef A kan ikke lægge en vare i forretning B''s kategori';
end $$;

/* Indstillinger gemmes som upsert. Primærnøglen er
   (lokation_id, noegle), og admin retter den samme nøgle igen og
   igen — "dagens_besked" bliver skrevet hver morgen. Rammer
   konflikten forkert, overskriver den ene forretning den andens
   forsidebesked, og ingen af dem opdager hvorfor. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.indstillinger (lokation_id, noegle, vaerdi)
    values ('proev-a', 'proev_noegle', '"rettet"'::jsonb)
    on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'BESTOD   ' else 'FEJLEDE  ' end
    || '13. Admin kan gemme den samme indstilling igen (upsert)';
end $$;

select pg_temp.svar(
  '14. Upserten rørte KUN forretning A''s række',
  (select count(*) = 1 from public.indstillinger
    where lokation_id = 'proev-a' and noegle = 'proev_noegle' and vaerdi = '"rettet"'::jsonb)
  and (select count(*) = 1 from public.indstillinger
    where lokation_id = 'proev-b' and noegle = 'proev_noegle' and vaerdi = '"også ja"'::jsonb));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.nyheder (lokation_id, titel, tekst, dato, aktiv)
    values ('proev-a', 'Prøvenyhed', 'Tekst', current_date, true);
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'BESTOD   ' else 'FEJLEDE  ' end
    || '15. Admin kan oprette en nyhed på sin egen lokation';
end $$;

-- =============== 4) GÆSTEN ==================================
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar(
  '16. En gæst kan ikke læse bestillinger overhovedet',
  (select count(*) = 0 from public.bestillinger));

select pg_temp.svar(
  '17. En gæst KAN læse menukortet',
  (select count(*) > 0 from public.menu_kategorier));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-a', 'PROEV-G1', 'Gæst', '33333333', current_date + 3, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1);
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'BESTOD   ' else 'FEJLEDE  ' end
    || '18. En gæst KAN afgive en bestilling';
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.menu_varer set pris = 1 where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'FEJLEDE  ' else 'BESTOD   ' end
    || '19. En gæst kan ikke ændre priser';
end $$;

-- =============== 5) EN FREMMED ==============================
set local role authenticated;
set local request.jwt.claims = '{"email":"ingen@fremmed.dk"}';

select pg_temp.svar(
  '20. En indlogget uden adgang ser ingen bestillinger',
  (select count(*) = 0 from public.bestillinger));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.admin_adgang (email, lokation_id)
    values ('ingen@fremmed.dk', 'proev-a');
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'FEJLEDE  ' else 'BESTOD   ' end
    || '21. En fremmed kan ikke give sig selv adgang';
end $$;

-- =============== 6) BREMSEN =================================
--  Fra supabase/bremse.sql. Har du ikke kørt den fil, fejler de
--  to prøver herunder — og det er det rigtige svar, for så er
--  der ingen bremse.
--
--  Bremsen skal måles fra gæstens side. Det er gæsten der ikke
--  må kunne fylde tabellen, og det er gæstens rolle der ikke må
--  kunne læse den — bremsen tæller rækker, gæsten ikke selv kan
--  se, og det er lige præcis dét, der kan gå galt.
-- ------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{}';

/* Fire bestillinger mere fra samme nummer. Der er allerede én
   (prøve 18), så efter den her løkke står nummeret på fem — og
   femte skal stadig være gået igennem. En bremse, der slår til
   for tidligt, er ikke sikkerhed, det er en gæst der ringer og
   spørger hvorfor siden ikke virker. */
do $$
declare gik boolean := true;
begin
  begin
    for i in 1..4 loop
      insert into public.bestillinger
        (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
      values ('proev-a', 'PROEV-R' || i, 'Gæst', '33333333',
              current_date + 3, ('13:0' || i)::time,
              '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1);
    end loop;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'BESTOD   ' else 'FEJLEDE  ' end
    || '22. Fem bestillinger fra samme nummer går igennem';
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-a', 'PROEV-R9', 'Gæst', '33333333',
            current_date + 3, '14:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":55}]'::jsonb, 1);
    gik := true;
  exception when others then gik := false;
  end;
  raise notice '%', case when gik then 'FEJLEDE  ' else 'BESTOD   ' end
    || '23. Den sjette fra samme nummer bliver bremset';
end $$;

rollback;

-- ------------------------------------------------------------
--  Alt ovenfor er rullet tilbage. Databasen er som før.
--  Står der FEJLEDE nogen steder, skal det rettes FØR der
--  kommer en kunde nr. 2 i databasen.
--
--  Linjen herunder står EFTER rollback med vilje: editoren
--  viser kun den sidste sætnings svar, og uden den ville der
--  bare stå "Success" — uden et ord om hvor resultaterne er.
-- ------------------------------------------------------------
select 'Prøverne er kørt og rullet tilbage. Resultaterne (BESTOD/FEJLEDE) står i beskederne/notices ovenfor.' as bemaerk;
