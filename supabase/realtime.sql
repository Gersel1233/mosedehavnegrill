-- ============================================================
--  REALTIME: DEN DIREKTE FORBINDELSE  (fase 5c)
--  ------------------------------------------------------------
--  Kør EFTER udlejning.sql. Kan køres igen uden at ødelægge noget.
--
--  Supabases realtime-tjeneste lytter på en publication ved navn
--  supabase_realtime. Kun tabeller, der er meldt til dér, sender
--  ændringer ud — og admin (js/admin/live.js) lytter på de fire
--  gæstetabeller, så en ny bestilling står på skærmen i samme
--  sekund, gæsten trykker send.
--
--  ADGANGEN ER DEN SAMME SOM ALTID: realtime håndhæver
--  tabellernes læseregler med lytterens eget token. Personalet
--  har læseregler og hører ændringerne; en gæst med anon-nøglen
--  har ingen og hører ingenting. Der åbnes altså IKKE noget nyt
--  her — der tændes kun for en kanal, reglerne allerede vogter.
-- ============================================================

begin;

-- Findes publication'en ikke (bar Postgres), laves den. Hos
-- Supabase findes den i forvejen.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Hver tabel meldes til, hvis den ikke allerede er det — "add
-- table" fejler på en tabel, der er med, og filen skal kunne
-- køres to gange.
do $$
declare t text;
begin
  foreach t in array array['bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
--  Tallet skal være 4 — én for hver gæstetabel.
-- ------------------------------------------------------------
select count(*) as "tabeller på realtime (skal være 4)"
  from pg_publication_tables
 where pubname = 'supabase_realtime'
   and schemaname = 'public'
   and tablename in ('bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger');
