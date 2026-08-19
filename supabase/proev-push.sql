-- ============================================================
--  PRØVE AF PUSH-TABELLEN  (fase 5c)
--  ------------------------------------------------------------
--  Kør EFTER push.sql. Hver prøve skriver BESTOD eller FEJLEDE,
--  og hele rapporten kommer til sidst som én "fejl" — det er den
--  ene kanal Supabases SQL Editor altid viser, og afbrydelsen
--  ruller prøvens data tilbage. Filen efterlader ingenting.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Et push-abonnement ER retten til at sende beskeder til en
--  telefon. Kunne en gæst læse tabellen, kunne enhver sende
--  til køkkenets enheder; kunne en gæst skrive i den, kunne
--  enhver få sin egen telefon til at bippe med i køkkenets
--  beskeder. Begge veje skal være lukkede — og forretning A må
--  ikke kunne se forretning B's enheder.
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

set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

-- =============== 1) PERSONALET KAN TILMELDE =================
do $$
declare gik boolean := false;
begin
  begin
    insert into public.push_abonnementer (lokation_id, email, enhed, endpoint, p256dh, auth)
    values ('proev-a', 'chef-a@proev.dk', 'Testtelefon',
            'https://push.eksempel/enhed-a1', 'p256dh-noegle-a1-lang-nok', 'auth-noegle-a1');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('1. Chef A KAN tilmelde en telefon', gik);
end $$;

select pg_temp.svar(
  '2. Chef A ser sin egen enhed',
  (select count(*) = 1 from public.push_abonnementer where lokation_id = 'proev-a'));

-- =============== 2) IKKE HINANDENS ==========================
set local request.jwt.claims = '{"email":"chef-b@proev.dk"}';

select pg_temp.svar(
  '3. Chef B ser IKKE forretning A''s enheder',
  (select count(*) = 0 from public.push_abonnementer where lokation_id = 'proev-a'));

do $$
declare gik boolean := false;
begin
  begin
    delete from public.push_abonnementer where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('4. Chef B kan ikke slette forretning A''s enheder', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.push_abonnementer (lokation_id, email, endpoint, p256dh, auth)
    values ('proev-a', 'chef-b@proev.dk',
            'https://push.eksempel/lusk', 'p256dh-noegle-lang-nok', 'auth-noegle-b');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('5. Chef B kan ikke tilmelde en enhed hos forretning A', not gik);
end $$;

-- =============== 3) GÆSTEN ER LUKKET HELT UDE ===============
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar(
  '6. En gæst kan ikke læse listen over telefoner',
  (select count(*) = 0 from public.push_abonnementer));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.push_abonnementer (lokation_id, email, endpoint, p256dh, auth)
    values ('proev-a', 'gaest@x.dk',
            'https://push.eksempel/gaest', 'p256dh-noegle-lang-nok', 'auth-noegle-g');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('7. En gæst kan ikke tilmelde en telefon', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    delete from public.push_abonnementer;
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('8. En gæst kan ikke slette abonnementer', not gik);
end $$;

-- =============== 4) DOBBELT OG VRØVL ========================
set local role authenticated;
set local request.jwt.claims = '{"email":"chef-a@proev.dk"}';

/* Samme enhed to gange er ét abonnement — telefonen skal ikke
   have hver besked to gange, fordi nogen trykkede til/fra. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.push_abonnementer (lokation_id, email, endpoint, p256dh, auth)
    values ('proev-a', 'chef-a@proev.dk',
            'https://push.eksempel/enhed-a1', 'p256dh-noegle-a1-lang-nok', 'auth-noegle-a1');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('9. Samme enhed to gange bliver afvist', not gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.push_abonnementer (lokation_id, email, endpoint, p256dh, auth)
    values ('proev-a', 'chef-a@proev.dk',
            'ftp://ikke-en-push-adresse', 'p256dh-noegle-lang-nok', 'auth-noegle-x');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('10. En adresse, der ikke er https, bliver afvist', not gik);
end $$;

-- =============== 5) OPRYDNING VIRKER ========================
do $$
declare gik boolean := false;
begin
  begin
    delete from public.push_abonnementer where lokation_id = 'proev-a';
    gik := found;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('11. Chef A KAN slette sin egen enhed igen', gik);
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

  raise exception E'\n============ RESULTATET AF PUSH-PRØVEN =====================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 11 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

-- Kun for psql: lukker den afbrudte transaktion pænt.
rollback;
