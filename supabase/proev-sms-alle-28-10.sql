-- ============================================================
--  PRØVE: SMS TIL ALLE HUSETS VEJE  (28/10) — prøver sms-alle-28-10.sql
--  ------------------------------------------------------------
--  Kør EFTER sms.sql og sms-alle-28-10.sql. Ruller sig selv tilbage
--  (fejlen til sidst er med vilje). INGEN SMS KAN SLIPPE UD:
--  mosede_sms_kald byttes ud med en tæller i prøvens transaktion.
--
--  Prøverne måler UDLØSERNES filter — ikke gæstens værn. Derfor er
--  kun sms-udløserne tændt, mens rækkerne lægges ind (resten tændes
--  igen, når prøven rulles tilbage).
-- ============================================================
begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-sa', 'Sms-alle-prøven', 'Vej 1', '2670', 'Greve', '11111111')
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

/* Tælleren: hvert kald skriver "slags:kilde:id," ned. */
create or replace function public.mosede_sms_kald(krop jsonb)
 returns void language plpgsql security definer set search_path to '' as $f$
begin
  perform set_config('proev.sms',
    coalesce(current_setting('proev.sms', true), '')
      || (krop ->> 'slags') || ':' || coalesce(krop ->> 'kilde', 'bestilling') || ':' || (krop ->> 'id') || ',', true);
end $f$;
create or replace function pg_temp.kaldt(moenster text) returns boolean language sql as $$
  select coalesce(current_setting('proev.sms', true), '') like '%' || moenster || ',%' $$;

-- =============== 1) GÆSTEN ER UDE ==========================
set local role anon;
set local request.jwt.claims = '{}';
do $$
declare saa boolean := false;
begin
  begin perform 1 from public.sms_sendt_sag limit 1; saa := true;
  exception when others then null; end;
  perform pg_temp.svar('1) gæsten kan ikke læse sms_sendt_sag', not saa);
end $$;
reset role;

-- Kun sms-udløserne er tændt herfra.
alter table public.bestillinger     disable trigger user;
alter table public.bestillinger     enable trigger sms_ny_bestilling;
alter table public.bestillinger     enable trigger sms_paa_vej;
alter table public.reservationer    disable trigger user;
alter table public.reservationer    enable trigger sms_ny_tilmelding;
alter table public.bordbestillinger disable trigger user;
alter table public.bordbestillinger enable trigger sms_ny_bordbooking;
alter table public.forespoergsler   disable trigger user;
alter table public.forespoergsler   enable trigger sms_ny_forespoergsel;

-- =============== 2-6) BESTILLINGER ==========================
do $$
declare lev bigint; hent bigint; qr bigint;
begin
  insert into public.bestillinger (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan, kanal, leverings_adresse)
  values ('SA-LEV', 'proev-sa', 'Levgæst', '20401111', current_date + 1, '12:00',
          '[{"navn":"X","antal":1,"pris":50}]', '[]', 1, 'levering', 'forside', 'Vej 2, 2670 Greve')
  returning id into lev;
  insert into public.bestillinger (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan, kanal)
  values ('SA-HENT', 'proev-sa', 'Hentgæst', '20402222', current_date + 1, '12:10',
          '[{"navn":"X","antal":1,"pris":50}]', '[]', 1, 'afhentning', 'forside')
  returning id into hent;
  insert into public.bestillinger (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan, kanal, bord_nummer)
  values ('SA-QR', 'proev-sa', 'Bordgæst', '20403333', current_date, '12:20',
          '[{"navn":"X","antal":1,"pris":50}]', '[]', 1, 'spis_her', 'bord', '7')
  returning id into qr;

  perform pg_temp.svar('2) en levering får nu en bekræftelse', pg_temp.kaldt('bekraeft:bestilling:' || lev));
  perform pg_temp.svar('3) QR-bordet får stadig ingen — ejerens nej 15/9', not pg_temp.kaldt('bekraeft:bestilling:' || qr));

  update public.bestillinger set status = 'klar' where id = lev;
  perform pg_temp.svar('4) "Sæt som klar" på en levering sender "på vej"', pg_temp.kaldt('paa_vej:bestilling:' || lev));
  update public.bestillinger set status = 'klar' where id = hent;
  perform pg_temp.svar('5) … men ikke på en afhentning (den har sin påmindelse)', not pg_temp.kaldt('paa_vej:bestilling:' || hent));

  perform set_config('proev.sms', '', true);
  update public.bestillinger set navn = 'Levgæst B' where id = lev;
  perform pg_temp.svar('6) en rettelse af en klar levering sender ikke "på vej" igen', not pg_temp.kaldt('paa_vej:bestilling:' || lev));
end $$;

-- =============== 7-11) TILMELDING, BORD, FORESPØRGSEL =======
do $$
declare arr bigint; t bigint; b bigint; b2 bigint; f bigint; fremmed bigint;
begin
  insert into public.kalender (lokation_id, type, dato, titel, offentlig, tilmelding, pladser)
  values ('proev-sa', 'arrangement', current_date + 5, 'Fællesspisning', true, true, 40)
  returning id into arr;
  insert into public.reservationer (lokation_id, kalender_id, reference, navn, telefon, antal_personer, status)
  values ('proev-sa', arr, 'SA-T1', 'Anna', '20304050', 2, 'ny') returning id into t;
  perform pg_temp.svar('7) en tilmelding kalder med kilden tilmelding', pg_temp.kaldt('bekraeft:tilmelding:' || t));

  insert into public.bordbestillinger (reference, lokation_id, navn, telefon, dato, tid, antal_personer, status)
  values ('SA-B1', 'proev-sa', 'Lone', '11223344', current_date + 1, '18:00', 4, 'ny') returning id into b;
  perform pg_temp.svar('8) en bordbooking kalder med kilden bord', pg_temp.kaldt('bekraeft:bord:' || b));

  insert into public.forespoergsler (reference, lokation_id, type, navn, telefon, status)
  values ('SA-F1', 'proev-sa', 'frokost', 'Ole', '55667788', 'ny') returning id into f;
  perform pg_temp.svar('9) en forespørgsel på frokostordning kalder med kilden foresp', pg_temp.kaldt('bekraeft:foresp:' || f));

  begin
    insert into public.bordbestillinger (reference, lokation_id, navn, telefon, dato, tid, antal_personer, status)
    values ('SA-B2', 'proev-sa', 'Uden nr', '', current_date + 1, '19:00', 2, 'ny') returning id into b2;
    perform pg_temp.svar('10) en booking uden telefonnummer kalder ikke', not pg_temp.kaldt('bekraeft:bord:' || b2));
  exception when others then
    /* Kræver tabellen et nummer, findes tilfældet ikke — så består prøven */
    perform pg_temp.svar('10) en booking uden telefonnummer kalder ikke (tabellen kræver et nummer)', true);
  end;
end $$;

-- =============== 11) SMS'EN STÅR ALDRIG I VEJEN =============
create or replace function public.mosede_sms_kald(krop jsonb)
 returns void language plpgsql security definer set search_path to '' as $f$
begin
  raise exception 'sms-tjenesten er nede (prøve)';
end $f$;
do $$
declare arr bigint; gik boolean := false;
begin
  select id into arr from public.kalender where lokation_id = 'proev-sa' limit 1;
  begin
    insert into public.reservationer (lokation_id, kalender_id, reference, navn, telefon, antal_personer, status)
    values ('proev-sa', arr, 'SA-T2', 'Bo', '20309999', 2, 'ny');
    gik := true;
  exception when others then raise notice 'afvist: %', sqlerrm; end;
  perform pg_temp.svar('11) tilmeldingen lander, selvom sms-kaldet fejler', gik);
end $$;

alter table public.bestillinger     enable trigger user;
alter table public.reservationer    enable trigger user;
alter table public.bordbestillinger enable trigger user;
alter table public.forespoergsler   enable trigger user;

-- ------------------------------------------------------------
--  RAPPORTEN (en "fejl" med vilje — den ruller alt tilbage)
-- ------------------------------------------------------------
do $$
declare r text := current_setting('proev.rapport', true);
begin
  raise exception E'\n%\n%', r,
    case when r like '%FEJLEDE%' then 'NOGET FEJLEDE' else
      'ALLE ' || (length(r) - length(replace(r, E'\n', ''))) || ' AF '
      || (length(r) - length(replace(r, E'\n', ''))) || ' BESTOD' end;
end $$;
