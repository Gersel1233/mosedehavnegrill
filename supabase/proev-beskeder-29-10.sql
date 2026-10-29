-- ============================================================
--  PRØVE: BESKEDERNE HÆNGER SAMMEN  (29/10) — prøver beskeder-29-10.sql
--  ------------------------------------------------------------
--  Kør EFTER beskeder-29-10.sql. Ruller sig selv tilbage (fejlen
--  til sidst er med vilje). INGEN SMS OG INGEN PUSH KAN SLIPPE UD:
--  mosede_sms_kald og mosede_push_kald byttes ud med tællere i
--  prøvens transaktion. Kun de udløsere, der prøves, er tændt.
-- ============================================================
begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-bk', 'Beskedprøven', 'Vej 1', '2670', 'Greve', '11111111')
on conflict (id) do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

create or replace function public.mosede_sms_kald(krop jsonb)
 returns void language plpgsql security definer set search_path to '' as $f$
begin
  perform set_config('proev.sms', coalesce(current_setting('proev.sms', true), '')
    || (krop ->> 'slags') || ':' || coalesce(krop ->> 'kilde', 'bestilling') || ':' || (krop ->> 'id') || ',', true);
end $f$;
create or replace function public.mosede_push_kald(krop jsonb)
 returns boolean language plpgsql security definer set search_path to '' as $f$
begin
  perform set_config('proev.push', coalesce(current_setting('proev.push', true), '')
    || (krop ->> 'table') || ':' || coalesce(krop -> 'record' ->> 'id', krop -> 'record' ->> 'enhed', '?') || ',', true);
  return true;
end $f$;
create or replace function pg_temp.sms(m text) returns boolean language sql as $$
  select coalesce(current_setting('proev.sms', true), '') like '%' || m || ',%' $$;
create or replace function pg_temp.push(m text) returns boolean language sql as $$
  select coalesce(current_setting('proev.push', true), '') like '%' || m || ',%' $$;

alter table public.bestillinger     disable trigger user;
alter table public.bestillinger     enable trigger sms_afvist_bestilling;
alter table public.reservationer    disable trigger user;
alter table public.reservationer    enable trigger sms_afvist_tilmelding;
alter table public.reservationer    enable trigger push_ny_tilmelding;
alter table public.bordbestillinger disable trigger user;
alter table public.bordbestillinger enable trigger sms_afvist_bord;

-- =============== BESTILLINGER =================================
do $$
declare hent bigint; lev bigint; qr bigint; gammel bigint;
begin
  insert into public.bestillinger (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan, kanal)
  values ('BK-HENT', 'proev-bk', 'Hentgæst', '20402222', current_date + 1, '12:10',
          '[{"navn":"X","antal":1,"pris":50}]', '[]', 1, 'afhentning', 'forside') returning id into hent;
  insert into public.bestillinger (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan, kanal, leverings_adresse)
  values ('BK-LEV', 'proev-bk', 'Levgæst', '20401111', current_date + 1, '12:00',
          '[{"navn":"X","antal":1,"pris":50}]', '[]', 1, 'levering', 'forside', 'Vej 2, 2670 Greve') returning id into lev;
  insert into public.bestillinger (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan, kanal, bord_nummer)
  values ('BK-QR', 'proev-bk', 'Bordgæst', '20403333', current_date, '12:20',
          '[{"navn":"X","antal":1,"pris":50}]', '[]', 1, 'spis_her', 'bord', '7') returning id into qr;
  insert into public.bestillinger (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan, kanal)
  values ('BK-GAMMEL', 'proev-bk', 'Gammelgæst', '20404444', current_date - 3, '12:00',
          '[{"navn":"X","antal":1,"pris":50}]', '[]', 1, 'afhentning', 'forside') returning id into gammel;

  update public.bestillinger set status = 'afvist' where id in (hent, lev, qr, gammel);
  perform pg_temp.svar('1) en afvist afhentning får en sms', pg_temp.sms('afvist:bestilling:' || hent));
  perform pg_temp.svar('2) en afvist levering får en sms', pg_temp.sms('afvist:bestilling:' || lev));
  perform pg_temp.svar('3) QR-bordet får aldrig en sms', not pg_temp.sms('afvist:bestilling:' || qr));
  perform pg_temp.svar('4) en oprydning i en gammel bestilling sender intet', not pg_temp.sms('afvist:bestilling:' || gammel));

  perform set_config('proev.sms', '', true);
  update public.bestillinger set navn = 'Hentgæst B' where id = hent;
  update public.bestillinger set status = 'afvist' where id = hent;
  perform pg_temp.svar('5) en rettelse af en afvist bestilling sender ikke igen', not pg_temp.sms('afvist:bestilling:' || hent));
  update public.bestillinger set status = 'bekraeftet' where id = hent;
  perform pg_temp.svar('6) Gendan sender ingen afvisning', not pg_temp.sms('afvist:bestilling:' || hent));
end $$;

-- =============== BORD OG TILMELDING ===========================
do $$
declare b bigint; arr bigint; t bigint;
begin
  insert into public.bordbestillinger (reference, lokation_id, navn, telefon, dato, tid, antal_personer, status)
  values ('BK-B1', 'proev-bk', 'Lone', '11223344', current_date + 1, '18:00', 4, 'ny') returning id into b;
  update public.bordbestillinger set status = 'afvist' where id = b;
  perform pg_temp.svar('7) en afvist bordbooking får en sms', pg_temp.sms('afvist:bord:' || b));

  insert into public.kalender (lokation_id, type, dato, titel, offentlig, tilmelding, pladser)
  values ('proev-bk', 'arrangement', current_date + 5, 'Quiz', true, true, 40) returning id into arr;
  insert into public.reservationer (lokation_id, kalender_id, reference, navn, telefon, antal_personer, status)
  values ('proev-bk', arr, 'BK-T1', 'Anna', '20304050', 2, 'ny') returning id into t;
  perform pg_temp.svar('8) en ny tilmelding giver personalet en push', pg_temp.push('reservationer:' || t));
  update public.reservationer set status = 'afvist' where id = t;
  perform pg_temp.svar('9) en afvist tilmelding får en sms', pg_temp.sms('afvist:tilmelding:' || t));
end $$;

alter table public.bestillinger     enable trigger user;
alter table public.reservationer    enable trigger user;
alter table public.bordbestillinger enable trigger user;

-- =============== PRØVEKNAPPEN =================================
insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@bk.dk', 'proev-bk', 'ejer', true, 'Chef'),
  ('anna@bk.dk', 'proev-bk', 'arrangoer', true, 'Anna');
insert into public.push_abonnementer (lokation_id, email, enhed, endpoint, p256dh, auth)
values ('proev-bk', 'chef@bk.dk', 'iPhone', 'https://web.push.apple.com/PROEVE-BK',
        repeat('p', 40), repeat('a', 16));

set local role authenticated;
set local request.jwt.claims = '{"email":"chef@bk.dk"}';
select pg_temp.svar('10) chefen kan sende en prøve til sin egen enhed',
  public.mosede_push_proeve('https://web.push.apple.com/PROEVE-BK') = 'sendt'
  and pg_temp.push('proeve:iPhone'));
select pg_temp.svar('11) en enhed, der ikke står på listen, får et ærligt svar',
  public.mosede_push_proeve('https://web.push.apple.com/FINDES-IKKE') = 'ikke_paa_listen');
set local request.jwt.claims = '{"email":"anna@bk.dk"}';
do $$
declare svar text;
begin
  begin svar := public.mosede_push_proeve('https://web.push.apple.com/PROEVE-BK');
  exception when others then svar := 'nej'; end;
  perform pg_temp.svar('12) eventudvalget kan ikke sende til køkkenets telefoner', svar = 'nej');
end $$;
reset role;
set local role anon;
do $$
declare svar text;
begin
  begin svar := public.mosede_push_proeve('https://web.push.apple.com/PROEVE-BK');
  exception when others then svar := 'nej'; end;
  perform pg_temp.svar('13) en gæst kan slet ikke kalde prøven', svar = 'nej');
end $$;
reset role;

do $$
declare r text := current_setting('proev.rapport', true);
begin
  raise exception E'\n%\n%', r,
    case when r like '%FEJLEDE%' then 'NOGET FEJLEDE' else
      'ALLE ' || (length(r) - length(replace(r, E'\n', ''))) || ' AF '
      || (length(r) - length(replace(r, E'\n', ''))) || ' BESTOD' end;
end $$;
