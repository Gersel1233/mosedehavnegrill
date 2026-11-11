-- ============================================================
--  KAMPAGNEKODER: EN RABATKODE MED START- OG SLUTDATO  (11/11 2026)
--  ------------------------------------------------------------
--  Jim: *"hvis vi laver en kampagne på 14 dage, så hvis de skriver
--  den rabatkode … så får de automatisk den lovede kampagne rabat"*.
--
--  Rabatkoderne fra rabatkoder-28-10.sql får to datoer:
--    · gyldig_fra  – første dag, koden virker (tom = fra nu)
--    · gyldig_til  – sidste dag, koden virker (tom = altid)
--  Begge dage er med, og det er DANSK tid. En fast firmaaftale har
--  ingen datoer og virker som før.
--
--  Datoen, der tælles, er den dag, gæsten BESTILLER — en kampagne
--  "bestil i uge 47" gælder også en bestilling til uge 48.
--
--  ⚠️ KØR rabatkoder-28-10.sql FØRST (den er kørt i produktionen).
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================
begin;

do $$
begin
  if to_regclass('public.rabatkoder') is null then
    raise exception 'Kør supabase/rabatkoder-28-10.sql først — så denne igen.';
  end if;
end $$;

alter table public.rabatkoder add column if not exists gyldig_fra date;
alter table public.rabatkoder add column if not exists gyldig_til date;
alter table public.rabatkoder drop constraint if exists rabatkode_periode_ok;
alter table public.rabatkoder add constraint rabatkode_periode_ok
  check (gyldig_fra is null or gyldig_til is null or gyldig_til >= gyldig_fra);

/* Samme udløser som 28/10 — nu også med perioden. Browseren sender
   kun koden; navn, procent og beløb sættes HER. */
create or replace function public.mosede_rabatkode()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.rabatkoder;
  sum_kr numeric;
  i_dag date := (now() at time zone 'Europe/Copenhagen')::date;
begin
  if nullif(btrim(coalesce(new.rabat_kode, '')), '') is null then
    new.rabat_kode := null; new.rabat_navn := null; new.rabat_procent := null; new.rabat_kr := null;
    return new;
  end if;
  select * into r from public.rabatkoder k
   where k.lokation_id = new.lokation_id and k.kode = upper(btrim(new.rabat_kode)) and k.aktiv
     and (k.gyldig_fra is null or k.gyldig_fra <= i_dag)
     and (k.gyldig_til is null or k.gyldig_til >= i_dag)
   limit 1;
  if r.id is null then
    raise exception 'rabatkode_ugyldig';
  end if;
  select coalesce(sum(
           case when jsonb_typeof(l -> 'pris') = 'number' and jsonb_typeof(l -> 'antal') = 'number'
                then (l ->> 'pris')::numeric * greatest((l ->> 'antal')::numeric, 0) else 0 end), 0)
    into sum_kr
    from jsonb_array_elements(coalesce(new.linjer, '[]'::jsonb)) l;
  new.rabat_kode := r.kode;
  new.rabat_navn := r.navn;
  new.rabat_procent := r.procent;
  new.rabat_kr := round(sum_kr * r.procent / 100.0);
  return new;
end $function$;

revoke all on function public.mosede_rabatkode() from public, anon, authenticated;

/* Gæstens opslag: en kode uden for sin periode svarer som en, der ikke
   findes. ⚠️ $1 og $2, ikke navnene — se noten i rabatkoder-28-10.sql. */
create or replace function public.mosede_tjek_rabatkode(kode text, lok text default 'mosede')
 returns table (navn text, procent int)
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select k.navn, k.procent from public.rabatkoder k
   where k.lokation_id = $2 and k.kode = upper(btrim($1)) and k.aktiv
     and (k.gyldig_fra is null or k.gyldig_fra <= (now() at time zone 'Europe/Copenhagen')::date)
     and (k.gyldig_til is null or k.gyldig_til >= (now() at time zone 'Europe/Copenhagen')::date)
   limit 1
$function$;
revoke all on function public.mosede_tjek_rabatkode(text, text) from public;
grant execute on function public.mosede_tjek_rabatkode(text, text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';

select case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'rabatkoder' and column_name = 'gyldig_til')
             and position('gyldig_til' in pg_get_functiondef('public.mosede_rabatkode()'::regprocedure)) > 0
             and position('gyldig_til' in pg_get_functiondef('public.mosede_tjek_rabatkode(text, text)'::regprocedure)) > 0
            then '✅ Kampagnekoderne er klar — sæt datoer på en kode i admin under Bestillinger'
            else '❌ Noget gik galt — sig til Lesreg' end as svar;
