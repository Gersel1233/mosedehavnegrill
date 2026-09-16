-- ============================================================
--  ARRANGEMENTET FÅR ET SLUTTIDSPUNKT  (16. september 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER arrangementer.sql og gaestens-regler.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Ejerens ord 16/9: "vi skal have en sluttidskolonne".
--
--  Bremsen afviste kun på DATO:
--
--      coalesce(arr.slut_dato, arr.dato) < current_date
--
--  og det er sandt HELE dagen. En koncert, der sluttede kl. 22,
--  tog stadig imod kl. 23.30 — og gæsten fik en kvittering til
--  noget, der var forbi. Hun møder op til en mørk mole.
--
--  ------------------------------------------------------------
--  ⚠️ TOM slut_kl BETYDER SOM FØR: ÅBEN DAGEN UD
--  ------------------------------------------------------------
--  Et heldagsarrangement har ingen sluttid, og et gæt ("slut =
--  start") ville lukke en tilmelding, ejeren aldrig har lukket.
--  Vi finder ikke på et tidspunkt på forretningens vegne. De
--  arrangementer, der allerede ligger i kalenderen, har ingen
--  sluttid og opfører sig derfor præcis som i går.
--
--  ------------------------------------------------------------
--  ⚠️ DANSK TID, IKKE UTC
--  ------------------------------------------------------------
--  Databasens current_date og current_time er UTC. Huset regner
--  i Europe/Copenhagen (se nu() i js/store.js), og en naiv
--  sammenligning ville lukke tilmeldingen TO TIMER for tidligt
--  om sommeren: kl. 20 dansk er kl. 18 i UTC. Derfor regnes der
--  eksplicit om herunder.
--
--  ⚠️ Datotjekket ovenfor står urørt med sin current_date. Det
--  har samme skævhed (et arrangement fra i går kan reserveres til
--  kl. 02 dansk tid), men det er en ANDEN adfærdsændring, og den
--  skal have sin egen prøve. Én ting ad gangen.
--
--  ------------------------------------------------------------
--  ⚠️ OG DEN SAMME REGEL STÅR TO STEDER — MED VILJE
--  ------------------------------------------------------------
--  js/store.js (reserverPlads) afviser det samme i browseren, så
--  gæsten får et svar uden at vente på databasen. Databasen er
--  den, der SIGER NEJ: en browser kan være dage gammel. Rettes
--  den ene, skal den anden med.
--
--  ⚠️ Funktionen skrives HELT om herunder, fordi
--  gaestens-regler.sql ejer den. Køres DEN fil igen bagefter, er
--  sluttidstjekket også med dér — begge steder er rettet.
-- ============================================================

alter table public.kalender
  add column if not exists slut_kl time;

comment on column public.kalender.slut_kl is
  'Hvornår arrangementet er slut. Tom = tilmeldingen er åben dagen ud.';

-- ------------------------------------------------------------
--  BREMSEN, MED SLUTTIDSPUNKTET
-- ------------------------------------------------------------
create or replace function public.reservation_bremse()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  arr        public.kalender%rowtype;
  optaget    int;
  fra_nummer int;
  paa_stedet int;
  dansk_nu   timestamp;
begin
  /* ⚠️ FOR UPDATE (15/9): to gæster på den sidste plads i samme
     sekund talte begge "38 af 40" og kom begge ind. Nu venter nummer
     to på, at nummer ét er committet, og tæller så 42. */
  select * into arr from public.kalender k where k.id = new.kalender_id for update;

  /* Findes arrangementet ikke, eller er det ikke offentligt, er
     der ikke noget at melde sig til. Et internt arrangement er
     personalets egen note — "Bent har ferie" — og en tilmelding
     til DEN ville være en fremmed, der har gættet et id. */
  if arr.id is null or not arr.offentlig then
    raise exception 'reservation_findes_ikke';
  end if;

  if not arr.tilmelding then
    raise exception 'reservation_lukket';
  end if;

  /* Overstået. Datoen er arrangementets, ikke dagens: en koncert
     i går kan ingen melde sig til, og en formular, der er åben i
     en gammel fane, må ikke kunne. */
  if coalesce(arr.slut_dato, arr.dato) < current_date then
    raise exception 'reservation_overstaaet';
  end if;

  /* ⚠️ OG SLUTTIDSPUNKTET, NÅR DAGEN ER I DAG (16/9). Datoen alene
     er sand hele dagen — se filhovedet. Tom slut_kl betyder som før:
     åben dagen ud. Dansk tid, ikke UTC. */
  dansk_nu := now() at time zone 'Europe/Copenhagen';
  if arr.slut_kl is not null
     and coalesce(arr.slut_dato, arr.dato) = dansk_nu::date
     and dansk_nu::time > arr.slut_kl then
    raise exception 'reservation_overstaaet';
  end if;

  /* ⚠️ PLADSERNE TÆLLES HER, IKKE I BROWSEREN. Kun det, der ikke er
     afvist eller slettet, tæller: et afslag skal frigive pladsen
     igen. Udeblevne tæller MED. */
  if arr.pladser is not null then
    select coalesce(sum(r.antal_personer), 0) into optaget
      from public.reservationer r
     where r.kalender_id = new.kalender_id
       and r.slettet is null
       and r.status <> 'afvist';

    if optaget + new.antal_personer > arr.pladser then
      raise exception 'reservation_udsolgt';
    end if;
  end if;

  /* Hvad en browser kan gøre én gang, kan et script gøre ti
     tusind gange. */
  select count(*) into fra_nummer
    from public.reservationer r
   where r.telefon = new.telefon
     and r.oprettet > now() - interval '24 hours';
  if fra_nummer >= 5 then
    raise exception 'reservation_bremse_nummer';
  end if;

  select count(*) into paa_stedet
    from public.reservationer r
   where r.lokation_id = new.lokation_id
     and r.oprettet > now() - interval '1 hour';
  if paa_stedet >= 60 then
    raise exception 'reservation_bremse_travlt';
  end if;

  return new;
end $function$;

-- Editoren viser kun den sidste sætnings svar — derfor en select.
select
  'kalender.slut_kl er på plads, og bremsen afviser efter sluttid (dansk tid)'
    as resultat,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'kalender'
      and column_name = 'slut_kl') as kolonnen_findes;
