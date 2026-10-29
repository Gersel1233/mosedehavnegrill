-- ============================================================
--  "FØLG DIN BESTILLING" VISER AFTALERABATTEN  (29/10 2026)
--  ------------------------------------------------------------
--  Mikkel om siden efter en bestilling: *"slet ikke opdateret og
--  gjort ordentligt … også sammenhængen"*. Én af skævhederne:
--  har gæsten brugt en rabatkode, sagde kvitteringen "Til betaling
--  ved lugen 259,-", mens min-bestilling/ sagde "I alt 288,-" om
--  den SAMME bestilling. Opslaget kendte ikke rabatten.
--
--  Den her fil giver opslaget to kolonner mere: aftalens navn og
--  rabatten i kroner. Stadig intet navn, telefon, mail, adresse
--  eller personalets note — og stadig ikke selve KODEN (den er
--  aftalens hemmelighed, se rabatkoder-28-10.sql).
--
--  ⚠️ KØR rabatkoder-28-10.sql FØRST. Kolonnerne kommer derfra;
--     uden dem stopper filen her med en dansk besked og ændrer
--     intet.
--  ⚠️ SVARETS FORM ÆNDRES, så funktionen skal droppes og laves
--     igen (Postgres kan ikke "create or replace" en ny form).
--     Det sker i én transaktion — opslaget er aldrig væk.
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'bestillinger'
                    and column_name = 'rabat_kr') then
    raise exception 'Kør supabase/rabatkoder-28-10.sql først — så denne igen.';
  end if;
end $$;

drop function if exists public.mosede_bestilling_status(text);

create function public.mosede_bestilling_status(ref text)
returns table (
  nummer integer,
  status text,
  hent_dato date,
  hent_tid time,
  bord_nummer text,
  hvordan text,
  antal integer,
  linjer jsonb,
  rabat_navn text,
  rabat_kr numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select b.nummer, b.status, b.hent_dato, b.hent_tid,
         b.bord_nummer, b.hvordan, b.antal, b.linjer,
         b.rabat_navn, b.rabat_kr
    from public.bestillinger b
   where b.reference = $1
     and b.slettet is null
     and b.hent_dato >= current_date - 1
   limit 1;
$$;

revoke all on function public.mosede_bestilling_status(text) from public;
grant execute on function public.mosede_bestilling_status(text)
  to anon, authenticated;

comment on function public.mosede_bestilling_status(text) is
  'Gæstens eget opslag på sin bestilling. Svarer kun på en reference, man HAR, kun til dagen efter hentedagen, og aldrig med navn, telefon, mail, leveringsadresse eller rabatkoden selv.';

commit;

notify pgrst, 'reload schema';

select case when exists (
         select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'mosede_bestilling_status'
            and p.prosecdef
            and pg_get_function_result(p.oid) like '%rabat_kr%')
       then '✅ "Følg din bestilling" kender nu aftalerabatten'
       else '❌ Noget gik galt — sig til Lesreg' end as svar;
