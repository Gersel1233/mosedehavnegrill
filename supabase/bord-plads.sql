-- ============================================================
--  HVILKET BORD FÅR DE?  (16. sep 2026)
--  ------------------------------------------------------------
--  Ejerens ord: bordbestillingen skal kunne styres ordentligt, og
--  personalet skal kunne se hvilket bord. MÅLT før: en booking bar
--  navn, telefon, dag, tid, antal og status — og INTET om bordet.
--  Personalet skrev "bord 4 ved vinduet" i notefeltet, altså i fri
--  tekst, og så kan systemet ikke se, at to familier har fået det
--  samme bord kl. 18.
--
--  ⚠️ DET ER KOLONNEN, DER GØR DET TIL ANDET END EN NOTE. Uden den
--  kunne vi godt lave en pæn bordvælger, der skrev i noten — men en
--  vælger, der ligner et værn uden at være det, er værre end ingen
--  vælger: personalet ville stole på den.
--
--  ⚠️ NULL ER DET NORMALE. Bordet tildeles, når personalet har lyst
--  — en booking uden bord er ikke en fejl, og gæsten sætter aldrig
--  feltet. bord/ sender det ikke, og anon afvises nedenfor.
--
--  ⚠️ OG DET ER PERSONALETS FELT, IKKE GÆSTENS. Kunne anon sætte
--  det, ville enhver med anon-nøglen kunne reservere sig selv bord 7
--  hver lørdag hele efteråret.
--
--  Værnet: det samme bord kan ikke være lovet væk to gange på
--  samme tid. Vinduet er ejerens eget (indstillingen
--  `bord_ophold_min`, 120 minutter som standard) — vi ved ikke, hvor
--  længe en middag varer, og et tal, vi selv fandt på, ville afvise
--  en booking, personalet sagtens kunne tage.
--
--  Prøve: proev-bord-plads.sql
-- ============================================================

alter table public.bordbestillinger
  add column if not exists bord_id bigint
    references public.borde(id) on delete set null;

comment on column public.bordbestillinger.bord_id is
  'Hvilket bord familien får. Sættes af personalet i admin; gæsten sender den aldrig.';

/* Slås op ved hver tildeling: samme forretning, samme dag, samme
   bord. Uden det ville værnet skanne hele tabellen på en travl
   lørdag. */
create index if not exists bordbestillinger_bord_dag
  on public.bordbestillinger (lokation_id, dato, bord_id)
  where bord_id is not null;

create or replace function public.mosede_bord_plads_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_ophold  numeric;
  v_bord    record;
  v_optaget record;
begin
  -- Ingen tildeling: intet at dømme. Det er også vejen til at
  -- FJERNE et bord igen.
  if new.bord_id is null then
    return new;
  end if;

  /* ⚠️ GÆSTEN SÆTTER ALDRIG BORDET. Feltet er personalets, og
     bord/ sender det ikke. En gæst, der prøver, får nej — ellers
     kunne enhver med anon-nøglen tage det samme bord hver lørdag. */
  if coalesce(auth.jwt() ->> 'role', '') = 'anon' then
    raise exception 'bord_plads_kun_personale';
  end if;

  /* Bordet skal findes, være aktivt og høre til den samme
     forretning. Et slukket bord er et bord, der ikke står der. */
  select b.id, b.nummer, b.aktiv into v_bord
    from public.borde b
   where b.id = new.bord_id
     and b.lokation_id = new.lokation_id;

  if v_bord.id is null then
    raise exception 'bord_plads_ukendt_bord';
  end if;
  if not v_bord.aktiv then
    raise exception 'bord_plads_bordet_er_slukket: %', v_bord.nummer;
  end if;

  /* ⚠️ I KØ, IKKE SIDE OM SIDE. To medarbejdere, der tildeler det
     samme bord i samme sekund, ser begge det gamle billede
     (READ COMMITTED) — og begge kommer igennem. Låsen er bordets
     egen række, så nummer to tæller efter, at nummer ét er inde.
     Samme greb som de fem lofter fra 15/9. */
  perform pg_advisory_xact_lock(hashtext('bord_plads:' || new.lokation_id
    || ':' || new.dato::text || ':' || new.bord_id::text));

  v_ophold := coalesce((select (i.vaerdi #>> '{}')::numeric
                          from public.indstillinger i
                         where i.lokation_id = new.lokation_id
                           and i.noegle = 'bord_ophold_min'), 120);
  if v_ophold is null or v_ophold <= 0 then v_ophold := 120; end if;

  /* Er bordet lovet væk inden for opholdet? Afviste, udeblevne og
     slettede tæller ikke: de sidder der ikke. */
  select bb.navn, bb.tid into v_optaget
    from public.bordbestillinger bb
   where bb.lokation_id = new.lokation_id
     and bb.dato = new.dato
     and bb.bord_id = new.bord_id
     and bb.id is distinct from new.id
     and bb.slettet is null
     and bb.status not in ('afvist', 'udeblevet')
     and abs(extract(epoch from (bb.tid - new.tid)) / 60) < v_ophold
   limit 1;

  if v_optaget.navn is not null then
    raise exception 'bord_plads_optaget: bord % er lovet til % kl. %',
      v_bord.nummer, v_optaget.navn, to_char(v_optaget.tid, 'HH24:MI');
  end if;

  return new;
end $function$;

drop trigger if exists bordbestilling_plads on public.bordbestillinger;
create trigger bordbestilling_plads
  before insert or update of bord_id on public.bordbestillinger
  for each row execute function public.mosede_bord_plads_vaern();
