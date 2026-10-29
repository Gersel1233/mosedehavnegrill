-- ============================================================
--  BESKEDERNE HÆNGER SAMMEN — PUSH OG SMS  (29/10 2026)
--  ------------------------------------------------------------
--  Mikkel: *"notifikationer skal lige være sikker på det virker,
--  men også med beskederne — de skal være helt perfekte til
--  hvordan det hænger sammen med spis her, levering, to go og
--  dato, og være korrekt i admin og nemt for hele personalet"*.
--
--  Fire ting:
--
--  1) PRØV PUSH PÅ DENNE ENHED. Admin → Kontakt → "Besked på
--     telefonen" har fået knappen «Send en prøve hertil». Den
--     kalder mosede_push_proeve(endpoint), som sender en besked
--     til DEN ENE enhed — ikke til hele personalet. Så kan man se
--     med egne øjne, om telefonen bipper.
--  2) PUSH VED NY TILMELDING. Bestillinger, borde og forespørgsler
--     har haft push siden 5/9; tilmeldinger til arrangementer
--     (tabellen reservationer) havde ingen. Nu bipper telefonen.
--  3) SMS, NÅR NOGET AFVISES. Afviser personalet en bestilling, en
--     bordbooking eller en tilmelding, får gæsten en sms med det
--     samme — ikke først, når nogen har nået at ringe. Kun noget,
--     der ligger i dag eller senere (en oprydning i gamle sager
--     sender intet), og aldrig ved QR-bordene.
--  4) Alt kalder de samme to Edge Functions (send-push og send-sms)
--     med adressen og hemmeligheden lånt fra webhooken
--     push_bestillinger — som sms.sql gør.
--
--  ⚠️ KRÆVER sms.sql og sms-alle-28-10.sql (tabellerne sms_sendt og
--     sms_sendt_sag) og push.sql. Stopper selv med en dansk besked,
--     hvis de mangler.
--  ⚠️ OG DE TO FUNKTIONER SKAL LÆGGES OP IGEN (send-push og send-sms,
--     udgave 2026-10-29) — ellers forstår de ikke de nye kald og
--     svarer bare "ignored". Intet går i stykker af det.
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Prøven er supabase/proev-beskeder-29-10.sql.
-- ============================================================
begin;

do $$
begin
  if to_regclass('public.sms_sendt') is null or to_regclass('public.sms_sendt_sag') is null then
    raise exception 'Kør supabase/sms.sql og supabase/sms-alle-28-10.sql først — så denne igen.';
  end if;
  if to_regclass('public.push_abonnementer') is null then
    raise exception 'Kør supabase/push.sql først — så denne igen.';
  end if;
end $$;

-- ------------------------------------------------------------
--  Afvist er en slags sms mere — på bestillingen og på sagerne
-- ------------------------------------------------------------
alter table public.sms_sendt drop constraint if exists sms_slags_ok;
alter table public.sms_sendt add constraint sms_slags_ok
  check (slags in ('bekraeft', 'paamind', 'paa_vej', 'afvist'));
alter table public.sms_sendt_sag drop constraint if exists sms_sag_slags_ok;
alter table public.sms_sendt_sag add constraint sms_sag_slags_ok
  check (slags in ('bekraeft', 'paamind', 'afvist'));

-- ------------------------------------------------------------
--  PUSH-KALDET — samme lån som mosede_sms_kald, men til send-push
-- ------------------------------------------------------------
create or replace function public.mosede_push_kald(krop jsonb)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a text[];
  h text;
begin
  select string_to_array(encode(t.tgargs, 'escape'), E'\\000') into a
    from pg_catalog.pg_trigger t
   where btrim(t.tgname, E' \t') = 'push_bestillinger' and not t.tgisinternal
   limit 1;
  if a is null or a[1] not like '%/functions/v1/send-push%' then
    raise warning 'push: webhooken push_bestillinger findes ikke — ingen push';
    return false;
  end if;
  h := (a[3]::jsonb) ->> 'x-mosede-secret';
  if h is null or h = '' then
    raise warning 'push: webhooken har ingen x-mosede-secret — ingen push';
    return false;
  end if;
  perform net.http_post(
    url := a[1],
    body := krop,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mosede-secret', h));
  return true;
end $function$;
revoke all on function public.mosede_push_kald(jsonb) from public, anon, authenticated;

-- 1) Prøven: kun til den enhed, der spørger, og kun hvis den står på listen
create or replace function public.mosede_push_proeve(endpoint text)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.push_abonnementer;
begin
  select * into r from public.push_abonnementer p where p.endpoint = $1 limit 1;
  if r.id is null then
    return 'ikke_paa_listen';
  end if;
  if not public.is_admin_for(r.lokation_id) then
    raise exception 'ingen adgang';
  end if;
  if public.mosede_push_kald(jsonb_build_object(
       'type', 'INSERT', 'table', 'proeve',
       'record', jsonb_build_object('lokation_id', r.lokation_id, 'endpoint', r.endpoint,
                                    'enhed', coalesce(r.enhed, 'enheden')))) then
    return 'sendt';
  end if;
  return 'ingen_webhook';
end $function$;
revoke all on function public.mosede_push_proeve(text) from public, anon;
grant execute on function public.mosede_push_proeve(text) to authenticated;

-- 2) Push ved ny tilmelding
create or replace function public.mosede_push_ny_tilmelding()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform public.mosede_push_kald(jsonb_build_object(
    'type', 'INSERT', 'table', 'reservationer', 'record', to_jsonb(new)));
  return new;
exception when others then
  raise warning 'push: kunne ikke kalde send-push (%)', sqlerrm;
  return new;
end $function$;
revoke all on function public.mosede_push_ny_tilmelding() from public, anon, authenticated;

drop trigger if exists push_ny_tilmelding on public.reservationer;
create trigger push_ny_tilmelding
  after insert on public.reservationer
  for each row execute function public.mosede_push_ny_tilmelding();

-- 3) SMS ved afvisning. tg_argv[0] er kilden: bestilling, bord, tilmelding.
create or replace function public.mosede_sms_afvist()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  idag date := (now() at time zone 'Europe/Copenhagen')::date;
  kilde text := tg_argv[0];
begin
  if new.status is distinct from 'afvist' or old.status = 'afvist'
     or to_jsonb(new) ->> 'slettet' is not null
     or nullif(btrim(coalesce(new.telefon, '')), '') is null then
    return new;
  end if;
  if kilde = 'bestilling' then
    if to_jsonb(new) ->> 'bord_nummer' is not null
       or coalesce(to_jsonb(new) ->> 'kanal', '') = 'bord'
       or (to_jsonb(new) ->> 'hent_dato')::date < idag then
      return new;
    end if;
    perform public.mosede_sms_kald(jsonb_build_object('slags', 'afvist', 'id', new.id));
  elsif kilde = 'bord' then
    if (to_jsonb(new) ->> 'dato')::date < idag then
      return new;
    end if;
    perform public.mosede_sms_kald(jsonb_build_object('slags', 'afvist', 'kilde', 'bord', 'id', new.id));
  else
    -- arrangementets dato tjekkes i send-sms, som læser kalenderen
    perform public.mosede_sms_kald(jsonb_build_object('slags', 'afvist', 'kilde', 'tilmelding', 'id', new.id));
  end if;
  return new;
exception when others then
  raise warning 'sms: kunne ikke kalde send-sms (%)', sqlerrm;
  return new;
end $function$;
revoke all on function public.mosede_sms_afvist() from public, anon, authenticated;

drop trigger if exists sms_afvist_bestilling on public.bestillinger;
create trigger sms_afvist_bestilling
  after update of status on public.bestillinger
  for each row execute function public.mosede_sms_afvist('bestilling');

drop trigger if exists sms_afvist_bord on public.bordbestillinger;
create trigger sms_afvist_bord
  after update of status on public.bordbestillinger
  for each row execute function public.mosede_sms_afvist('bord');

drop trigger if exists sms_afvist_tilmelding on public.reservationer;
create trigger sms_afvist_tilmelding
  after update of status on public.reservationer
  for each row execute function public.mosede_sms_afvist('tilmelding');

commit;

notify pgrst, 'reload schema';

select case when exists (select 1 from pg_trigger where tgname = 'push_ny_tilmelding')
             and exists (select 1 from pg_trigger where tgname = 'sms_afvist_bestilling')
             and exists (select 1 from pg_trigger where tgname = 'sms_afvist_bord')
             and exists (select 1 from pg_trigger where tgname = 'sms_afvist_tilmelding')
             and exists (select 1 from pg_proc where proname = 'mosede_push_proeve')
            then case when exists (select 1 from pg_trigger where btrim(tgname, E' \t') = 'push_bestillinger')
                      then '✅ Beskederne er klar — læg send-push og send-sms op igen, og tryk «Send en prøve hertil» i admin'
                      else '⚠️ Klar, men webhooken push_bestillinger findes ikke — så sendes der hverken push eller sms. Sig til Lesreg.' end
            else '❌ Noget gik galt — sig til Lesreg' end as svar;
