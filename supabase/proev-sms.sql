-- ============================================================
--  PRØVE: SMS TIL GÆSTEN  (24/10) — prøver supabase/sms.sql
--  ------------------------------------------------------------
--  Kør EFTER sms.sql. Ruller sig selv tilbage (fejlen til sidst er
--  med vilje) — der bliver hverken en bestilling eller en sms.
--
--  ⚠️ INGEN SMS KAN SLIPPE UD HERFRA. mosede_sms_kald byttes ud med
--     en tæller i prøvens egen transaktion, FØR den første
--     bestilling lægges (prøve 3 og frem), og pg_net sender kun det,
--     der bliver committet — og intet bliver committet.
--
--  Det, filen beviser:
--   1-2  gæsten kan hverken læse sms_sendt eller kalde send-sms selv
--   3    en bestilling lander, SELVOM sms-kaldet fejler
--   4    afhentning fra siden kalder send-sms med sin egen id
--   5-9  spis her kalder; levering, QR-bordet og kanal 'bord' gør ikke
-- ============================================================
begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-s', 'Sms-prøven', 'Vej 1', '2670', 'Greve', '11111111')
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

-- =============== 1-2) GÆSTEN ER UDE ==========================
set local role anon;
set local request.jwt.claims = '{}';
do $$
declare saa boolean := false; kaldte boolean := false;
begin
  begin perform 1 from public.sms_sendt limit 1; saa := true;
  exception when others then null; end;
  perform pg_temp.svar('1) gæsten kan ikke læse sms_sendt', not saa);
  begin perform public.mosede_sms_kald('{"slags":"paamind"}'::jsonb); kaldte := true;
  exception when others then null; end;
  perform pg_temp.svar('2) gæsten kan ikke kalde send-sms (det koster penge)', not kaldte);
end $$;
reset role;

-- =============== 3) SMS'EN STÅR ALDRIG I VEJEN ===============
/* Kaldet byttes ud med et, der altid fejler. Bestillingen skal
   lande alligevel — ellers ville en nede sms-tjeneste lukke for
   bestillingerne. Byttet gælder kun i prøvens transaktion. */
create or replace function public.mosede_sms_kald(krop jsonb)
 returns void language plpgsql security definer set search_path to '' as $f$
begin
  raise exception 'sms-tjenesten er nede (prøve)';
end $f$;

/* Dag og tid regnes ud (aldrig et fast årstal), og hver bestilling
   får sit eget klokkeslæt og nummer — dubletvagten og bremsen må
   ikke være dem, der afviser (arrene i proev-bestilling-kanal.sql). */
/* ⚠️ INGEN `returning`: gæsten må ikke læse rækken tilbage, og
   RETURNING kræver netop det (RLS svarer "violates row-level
   security policy" — målt). Id'et slås op bagefter, uden for
   gæstens rolle, af referencen. */
create or replace function pg_temp.laeg(i int, hv text, k text, bord text default null)
returns text language plpgsql as $$
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, fyld, antal, hvordan, kanal, bord_nummer, leverings_adresse)
  values ('SM-SMS-' || i, 'proev-s', 'Smsgæst', '2040' || lpad(i::text, 4, '0'),
          current_date + 2, '12:00'::time + (i || ' minutes')::interval,
          '[{"navn":"PRØVEVARE-SMS","antal":1,"pris":50}]'::jsonb, '[]'::jsonb, 1,
          hv, k, bord, case when hv = 'levering' then 'Vej 2, 2670 Greve' end);
  return 'SM-SMS-' || i;
end $$;
create or replace function pg_temp.kaldt(ref text) returns boolean language sql as $$
  select coalesce(current_setting('proev.sms', true), '')
         like '%:' || (select id from public.bestillinger where reference = ref) || ',%' $$;

set local role anon;
set local request.jwt.claims = '{}';
do $$
declare gik boolean := false;
begin
  begin perform pg_temp.laeg(1, 'afhentning', 'forside'); gik := true;
  exception when others then raise notice 'afvist: %', sqlerrm; end;
  perform pg_temp.svar('3) bestillingen lander, selvom sms-kaldet fejler', gik);
end $$;
reset role;

-- =============== 4-8) HVEM KALDER send-sms ===================
/* Nu en tæller i stedet: hvert kald skriver id'et ned. */
create or replace function public.mosede_sms_kald(krop jsonb)
 returns void language plpgsql security definer set search_path to '' as $f$
begin
  perform set_config('proev.sms',
    coalesce(current_setting('proev.sms', true), '') || (krop ->> 'slags') || ':' || (krop ->> 'id') || ',', true);
end $f$;

set local role anon;
set local request.jwt.claims = '{}';
do $$
begin
  perform pg_temp.laeg(2, 'afhentning', 'smoerrebroed');
  perform pg_temp.laeg(3, 'spis_her', 'forside');
exception when others then
  raise notice 'afvist: %', sqlerrm;
end $$;
reset role;
do $$
begin
  perform pg_temp.svar('4) afhentning fra siden kalder send-sms med sin egen id', pg_temp.kaldt('SM-SMS-2'));
  perform pg_temp.svar('5) spis her (hjemmefra) kalder send-sms', pg_temp.kaldt('SM-SMS-3'));
end $$;

/* 6-8 handler om udløserens FILTER, ikke om gæstens værn — en
   levering skal have en gyldig adresse og et bord en QR-nøgle, og
   prøven ville ellers måle de værn i stedet. Derfor står KUN
   sms-udløseren tændt her (resten af udløserne slukkes i prøvens
   transaktion og tændes, når den rulles tilbage). */
alter table public.bestillinger disable trigger user;
alter table public.bestillinger enable trigger sms_ny_bestilling;
do $$
begin
  perform pg_temp.laeg(4, 'levering', 'forside');
  perform pg_temp.laeg(5, 'spis_her', 'forside', '7');
  perform pg_temp.laeg(6, 'afhentning', 'bord');
  perform pg_temp.laeg(7, 'afhentning', 'forside');
  perform pg_temp.svar('6) levering kalder ikke', not pg_temp.kaldt('SM-SMS-4'));
  perform pg_temp.svar('7) QR-bordet (bord_nummer) kalder ikke — ejerens nej 15/9', not pg_temp.kaldt('SM-SMS-5'));
  perform pg_temp.svar('8) kanal ''bord'' kalder ikke', not pg_temp.kaldt('SM-SMS-6'));
  /* modstykket: uden det ville et filter, der aldrig kaldte, bestå 6-8 */
  perform pg_temp.svar('9) … men en almindelig afhentning kalder også her', pg_temp.kaldt('SM-SMS-7'));
end $$;
alter table public.bestillinger enable trigger user;

-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen prøver kørte)');
declare antal int := (length(r) - length(replace(r, 'BESTOD', ''))) / 6;
declare faldt int := (length(r) - length(replace(r, 'FEJLEDE', ''))) / 7;
begin
  raise exception E'\n\n===== PRØVE AF SMS TIL GÆSTEN =====\n%\n%\n\n(Fejlen her er med vilje: den ruller prøvens data tilbage — og intet blev sendt.)\n',
    r,
    case when faldt = 0
      then 'ALLE ' || antal || ' AF ' || (antal + faldt) || ' BESTOD'
      else '⚠️  ' || faldt || ' FEJLEDE — læs linjerne ovenfor' end;
end $$;

rollback;
