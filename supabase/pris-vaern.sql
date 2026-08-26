-- ============================================================
--  PRIS-VÆRNET: EN VARE UDEN PRIS KAN IKKE BESTILLES  (aug 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER setup.sql og menukort-filerne. Filen kan køres igen
--  uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Varer uden pris KUNNE bestilles — "??" på listen, og gæsten
--  fik prisen, "når vi ringer og bekræfter" (kundens ord 23/8).
--  Men opkaldet forsvandt samme dag: auto_bekraeft blev slået
--  til, og "bestilt er bestilt". Så var der ingen tilbage til at
--  sige prisen. Bestillingen gik bare igennem, gæsten anede
--  ikke, hvad den kostede, og i salgstallene talte varen som
--  0 kr. — et tal, der var for lavt, uden at nogen kunne se det.
--
--  Præcis den fejl stod fire dage i spiis' produktionsdatabase,
--  før nogen så den (25/8): kurven sagde "i alt 10 kr.", og det
--  var kun emballagen.
--
--  Hos os er hullet større: over halvdelen af kortets 242 varer
--  står uden pris, til ejeren har skrevet tallene i admin.
--
--  Siderne viser nu varen uden plusknap og med et trykbart
--  nummer — men browseren må ikke være den eneste, der kender
--  reglen: en gammel fane har varen liggende i kurven fra før.
--  Samme princip som udsolgt-værnet i bord-loft.sql.
--
--  ⚠️ VÆRNET SIGER KUN NEJ TIL NAVNE, DER FINDES PÅ KORTET.
--  Dagens ret bor i sin egen tabel og har sit eget værn i
--  klienten (retKanBestilles); et navn, der slet ikke er en
--  menuvare, rører værnet ikke. Ellers ville en ret, ejeren
--  skrev i hånden i morges, blive umulig at bestille.
--
--  ⚠️ OG KUN LINJERNE — ALDRIG FYLDET. Fyld uden pris er ØNSKER
--  pr. model A ("kan vi prissætte det, kan det bestilles — kan
--  vi ikke, kan det ønskes"), og de skal kunne sendes.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  Sammenligningen er lower(btrim(navn)) — den samme som
--  udsolgt-værnet og dagens-retter-bremsen bruger. To måder at
--  sammenligne det samme navn på ville betyde, at "Smash-burger "
--  slap forbi det ene værn og ikke det andet.
--
--  "Uden pris" betyder: navnet står på kortet som en KØBBAR vare
--  (aktiv, i en aktiv kategori, ikke udsolgt), og INGEN af de
--  rækker har en pris. Står det samme navn i to kategorier, og
--  den ene har pris, kan varen købes — det er den prissatte, der
--  sælges.
--
--  security definer + låst søgesti, som alle de andre værn:
--  gæsten må ikke selv slå op i menu_varer ud over adgangsreglen,
--  og værnet skal give det samme svar, uanset hvem der sender.
-- ------------------------------------------------------------
create or replace function public.mosede_pris_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linje  jsonb;
  navnet text;
begin
  if new.linjer is null then return new; end if;

  for linje in select * from jsonb_array_elements(new.linjer)
  loop
    navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
    if navnet = '' then continue; end if;

    if exists (
      select 1
        from public.menu_varer v
        join public.menu_kategorier k on k.id = v.kategori_id
       where lower(btrim(v.navn)) = navnet
         and (k.lokation_id is null or k.lokation_id = new.lokation_id)
         and v.aktiv and k.aktiv and not v.udsolgt
    ) and not exists (
      select 1
        from public.menu_varer v
        join public.menu_kategorier k on k.id = v.kategori_id
       where lower(btrim(v.navn)) = navnet
         and (k.lokation_id is null or k.lokation_id = new.lokation_id)
         and v.aktiv and k.aktiv and not v.udsolgt
         and v.pris is not null
    ) then
      raise exception 'bestilling_vare_uden_pris: %', coalesce(linje ->> 'navn', '');
    end if;
  end loop;

  return new;
end $$;

comment on function public.mosede_pris_vaern() is
  'Afviser en bestilling på en vare, der står på kortet uden pris. Ingen ringer og siger prisen (auto_bekraeft), og i salgstallene talte den som 0 kr. Fyldet (ønsker) og navne uden for kortet røres ikke.';

drop trigger if exists bestilling_pris_vaern on public.bestillinger;
create trigger bestilling_pris_vaern
  before insert on public.bestillinger
  for each row execute function public.mosede_pris_vaern();

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from pg_trigger
    where tgrelid = to_regclass('public.bestillinger')
      and tgname = 'bestilling_pris_vaern')
    as "pris-vaernet (skal være 1)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mosede_pris_vaern'
      and p.prosecdef)
    as "med sine egne oejne (skal være 1)";
