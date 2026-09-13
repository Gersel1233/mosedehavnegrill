-- ============================================================
--  UGENS PÅMINDELSE TIL PERSONALET  (14. september 2026)
--  ------------------------------------------------------------
--  Kundens ord: "hver lørdag og søndag … en personalemeddelelse:
--  husk at indstille ugens dagens retter, og tjek, at de ikke sælger
--  noget, de ikke har, og er klar til ugen".
--
--  Lørdag og søndag kl. 10 (dansk tid, også om vinteren) sender
--  databasen selv en push til de telefoner, der har slået beskeder
--  til. Den samme besked står i klokken i admin (js/admin/klokke.js),
--  med tallet for, hvor mange af næste uges dage der har en ret.
--
--  ⚠️ HEMMELIGHEDEN STÅR IKKE I FILEN — OG IKKE ET ANDET STED END DER,
--     HVOR DEN STÅR I FORVEJEN. Funktionen læser headeren fra webhooken
--     push_bestillinger, når den kører. Skiftes PUSH_SECRET, og rettes
--     de fire webhooks, følger påmindelsen med af sig selv. En kopi i
--     en tabel eller i vault ville være et femte sted at huske.
--  ⚠️ INGEN ANDEN MÅ KALDE DEN. Den kan få telefonerne til at bippe,
--     så anon og authenticated har ikke lov (revoke nedenfor) — kun
--     pg_cron (som postgres) kalder den.
--  ⚠️ pg_cron KØRER PÅ UTC. Jobbet står kl. 8 OG 9 UTC, og funktionen
--     sender kun, når klokken er 10 i København — så den kommer én gang
--     kl. 10, både sommer og vinter.
--  ⚠️ DAGENE OG KLOKKESLÆTTET STÅR OGSÅ i js/admin/klokke.js
--     (PAAMINDELSE_DAGE, PAAMINDELSE_FRA_MIN). En prøve holder dem ens.
--
--  Kan køres igen. Uden pg_cron (en lokal database) oprettes
--  funktionen, men intet job.
-- ============================================================
begin;

create or replace function public.mosede_ugepaamindelse(tving boolean default false, lok text default 'mosede')
 returns bigint
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a  text[];
  h  text;
  nu timestamp := now() at time zone 'Europe/Copenhagen';
begin
  -- Lørdag (isodow 6) og søndag (7), kl. 10 dansk tid. `tving` er til
  -- at prøve vejen af med en forretning uden telefoner.
  if not tving and (extract(isodow from nu) not in (6, 7) or extract(hour from nu) <> 10) then
    return null;
  end if;

  select string_to_array(encode(t.tgargs, 'escape'), E'\\000') into a
    from pg_catalog.pg_trigger t
   where btrim(t.tgname, E' \t') = 'push_bestillinger' and not t.tgisinternal
   limit 1;
  if a is null then
    raise warning 'ugepaamindelse: webhooken push_bestillinger findes ikke — ingen push sendt';
    return null;
  end if;

  h := (a[3]::jsonb) ->> 'x-mosede-secret';
  if h is null or h = '' then
    raise warning 'ugepaamindelse: webhooken har ingen x-mosede-secret — ingen push sendt';
    return null;
  end if;

  return net.http_post(
    url := a[1],
    body := jsonb_build_object('type', 'INSERT', 'table', 'paamindelse',
                               'record', jsonb_build_object('lokation_id', lok)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mosede-secret', h));
end $function$;

revoke all on function public.mosede_ugepaamindelse(boolean, text) from public, anon, authenticated;

commit;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'mosede-ugepaamindelse';
    perform cron.schedule('mosede-ugepaamindelse', '0 8,9 * * 6,0',
                          'select public.mosede_ugepaamindelse()');
  else
    raise notice 'pg_cron findes ikke her — funktionen står, men påmindelsen sendes ikke';
  end if;
end $$;

select 'Funktionen findes og er kun postgres''' as tjek,
       exists (select 1 from pg_proc where proname = 'mosede_ugepaamindelse')
       and not has_function_privilege('anon', 'public.mosede_ugepaamindelse(boolean, text)', 'execute') as ok;
