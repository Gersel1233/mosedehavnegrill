-- ============================================================
--  SMS TIL GÆSTEN: BEKRÆFTELSE + PÅMINDELSE 30 MIN. FØR  (24/10)
--  ------------------------------------------------------------
--  ⚠️ Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--     Mosede er epwyjzakvvbxtpvnhvbn. Kør EFTER push.sql og
--     ugepaamindelse.sql — filen låner push-webhookens adresse og
--     hemmelighed (se punkt 2).
--
--  Mikkels ord 24/10: *"beskeder … det samme [som spiis], men
--  selvfølgelig til deres forskellige principper med levering og
--  hvornår det præcis er klar"*. Hans valg: kun AFHENTNING og SPIS
--  HER — og bygget SLUKKET, til ejeren selv slår det til.
--
--  ⚠️ EJERENS NEJ 15/9 STÅR STADIG, TIL HAN SIGER ANDET. Om "Din mad
--     er klar" ved bordene: *"for dyrt i længden"*. Derfor:
--     · ved bordet (QR, bord_nummer) får ALDRIG en sms
--     · levering får ingen (Mikkels valg 24/10)
--     · Edge Function'en send-sms sender intet, før SMS_AKTIV = ja
--       står under Edge Functions → Secrets. Indtil da skriver den
--       kun i loggen, hvad den VILLE have sendt.
--
--  HVAD GÆSTEN FÅR (send-sms.ts bygger teksten):
--   1) lige når bestillingen er lagt: nummeret, dag, klokkeslæt,
--      og et link til min-bestilling/, hvor den kan følges
--   2) ca. 30 min. før hent_tid: "om ca. 30 min er din mad klar
--      ved lugen — sig nummer M-0047". Ikke hvis der blev bestilt
--      under en time før (så er bekræftelsen påmindelse nok), og
--      ikke hvis bestillingen er afvist, hentet, udeblevet eller
--      i skraldespanden.
--
--  ⚠️ EN SMS MÅ ALDRIG STÅ I VEJEN FOR EN BESTILLING. Udløseren er
--     AFTER insert, kalder kun pg_net (som sender bagefter, uden
--     for transaktionen), og fanger enhver fejl. Går sms'en galt,
--     er bestillingen der stadig — prøvet i proev-sms.sql.
--
--  ⚠️ BESTILLINGEN RØRES ALDRIG. Hvem der har fået hvad, står i sin
--     egen tabel, sms_sendt. Et stempel PÅ bestillingen ville være
--     en "rettet"-linje i logbogen (logbog.sql) for hver eneste sms,
--     og en realtime-ændring på personalets skærm uden grund.
--
--  Kan køres igen uden at ødelægge noget. Prøven er proev-sms.sql.
--  Uden pg_cron (en lokal database) oprettes alt undtagen jobbet.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  1) HVEM HAR FÅET HVAD
--     Én række pr. sms. Den unikke nøgle ER værnet mod dobbelt-sms:
--     send-sms indsætter rækken FØR den sender, og kun den, der når
--     det, sender. Fejler afsendelsen, slettes rækken igen, så næste
--     runde prøver igen.
--     Ingen regler for anon/authenticated: RLS er slået til og der er
--     ingen policy, så svaret er nej til alle andre end service_role.
--     Telefonnummeret står IKKE her — det står på bestillingen.
-- ------------------------------------------------------------
create table if not exists public.sms_sendt (
  bestilling_id bigint not null references public.bestillinger(id) on delete cascade,
  slags         text   not null,
  sendt         timestamptz not null default now(),
  primary key (bestilling_id, slags),
  constraint sms_slags_ok check (slags in ('bekraeft', 'paamind'))
);
alter table public.sms_sendt enable row level security;
revoke all on public.sms_sendt from anon, authenticated;
comment on table public.sms_sendt is
  'Hvilke sms''er gæsten har fået pr. bestilling (bekraeft/paamind). Kun send-sms (service_role) skriver. Se supabase/sms.sql.';

-- ------------------------------------------------------------
--  2) KALD send-sms
--     ⚠️ ADRESSEN OG HEMMELIGHEDEN LÅNES FRA PUSH-WEBHOOKEN, præcis
--     som mosede_ugepaamindelse gør. Edge Functions' secrets gælder
--     for hele projektet, så send-sms læser den samme PUSH_SECRET som
--     send-push. Et nyt hemmeligt ord i vault ville være ét sted mere
--     at huske, og ét sted mere, der kan blive uenigt med de andre.
-- ------------------------------------------------------------
create or replace function public.mosede_sms_kald(krop jsonb)
 returns void
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
    raise warning 'sms: webhooken push_bestillinger findes ikke — ingen sms';
    return;
  end if;
  h := (a[3]::jsonb) ->> 'x-mosede-secret';
  if h is null or h = '' then
    raise warning 'sms: webhooken har ingen x-mosede-secret — ingen sms';
    return;
  end if;

  perform net.http_post(
    url := replace(a[1], '/functions/v1/send-push', '/functions/v1/send-sms'),
    body := krop,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mosede-secret', h));
end $function$;

revoke all on function public.mosede_sms_kald(jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------
--  3) NY BESTILLING → BEKRÆFTELSE
--     Kun afhentning og spis her, kun med et telefonnummer, og
--     aldrig ved bordet: bord_nummer ELLER kanal 'bord' (de to kan
--     skilles ad — se proev-bestilling-kanal.sql, prøve 5).
--     Reglen står her OG i send-sms.ts; funktionen tjekker igen, for
--     en række kan være rettet mellem de to.
-- ------------------------------------------------------------
create or replace function public.mosede_sms_ny_bestilling()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.hvordan in ('afhentning', 'spis_her')
     and new.bord_nummer is null
     and coalesce(new.kanal, '') <> 'bord'
     and nullif(btrim(coalesce(new.telefon, '')), '') is not null then
    perform public.mosede_sms_kald(jsonb_build_object('slags', 'bekraeft', 'id', new.id));
  end if;
  return new;
exception when others then
  -- en sms må aldrig stoppe en bestilling
  raise warning 'sms: kunne ikke kalde send-sms (%)', sqlerrm;
  return new;
end $function$;

revoke all on function public.mosede_sms_ny_bestilling() from public, anon, authenticated;

drop trigger if exists sms_ny_bestilling on public.bestillinger;
create trigger sms_ny_bestilling
  after insert on public.bestillinger
  for each row execute function public.mosede_sms_ny_bestilling();

commit;

-- ------------------------------------------------------------
--  4) HVERT 5. MINUT: PÅMINDELSERNE
--     send-sms finder selv dem, der skal hente om ca. 30 min. Jobbet
--     kører døgnet rundt; uden bestillinger koster det et kald, der
--     intet sender.
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'mosede-sms-paamind';
    perform cron.schedule('mosede-sms-paamind', '*/5 * * * *',
                          'select public.mosede_sms_kald(''{"slags":"paamind"}''::jsonb)');
  else
    raise notice 'pg_cron findes ikke her — alt står, men påmindelserne sendes ikke';
  end if;
end $$;

-- ------------------------------------------------------------
--  ER DEN LANDET?  (SQL Editor viser kun den sidste sætnings svar)
-- ------------------------------------------------------------
select
  to_regclass('public.sms_sendt') is not null                          as "tabellen sms_sendt",
  exists (select 1 from pg_trigger where tgname = 'sms_ny_bestilling') as "udløseren på bestillinger",
  exists (select 1 from pg_trigger
           where btrim(tgname, E' \t') = 'push_bestillinger')           as "push-webhooken (adressen lånes)",
  (case when to_regclass('cron.job') is null then false
        else (xpath('/row/c/text()', query_to_xml(
              'select count(*) as c from cron.job where jobname = ''mosede-sms-paamind''',
              false, true, '')))[1]::text::int = 1 end)                as "påmindelsen hvert 5. minut";

-- ── SLUK IGEN ─────────────────────────────────────────────────
-- Hurtigst: SMS_AKTIV = nej under Edge Functions → Secrets.
-- Helt væk:
--   select cron.unschedule('mosede-sms-paamind');
--   drop trigger if exists sms_ny_bestilling on public.bestillinger;
