-- ============================================================
--  ÅBN MENUKORTET FOR BESTILLING   (30. august 2026)
-- ============================================================
--  Mikkels spørgsmål: "kan du ikke bare give en SQL, der fikser
--  alt det her og gør hele siden klar?"
--
--  Den her tager ÉN af de fire ting. De tre andre kan SQL ikke
--  klare, og det er ikke en teknisk begrænsning:
--
--   · Facebook-adressen kender jeg ikke. Et gæt sender gæsten til
--     en anden forretning. → admin → Kontakt
--   · Billeder kan SQL ikke lægge op, og jeg har ingen fotos af
--     tapasfadet eller baglokalet. → admin → Forside
--   · Et arrangement ville være en opdigtet aften. En familie,
--     der kører til havnen fredag kl. 19 efter en koncert, der
--     aldrig har eksisteret, har spildt en aften. Det er den ene
--     regel, hele projektet er bygget på. → admin → Kalender
--
--  ⚠️ HVILKE KATEGORIER ER EN FORRETNINGSBESLUTNING, ikke en
--  teknisk. Listen nedenfor er et FORSLAG, bygget på ejerens egne
--  trykte kort: alt, hvad køkkenet laver på bestilling i forvejen.
--  Står der noget, I ikke kan nå til et aftalt klokkeslæt på en
--  travl fredag, så slet linjen — eller ret det bagefter i
--  admin → Menukort, hvor det ene flueben er ét tryk.
--
--  Kaffe og varme drikke er MED VILJE ikke på listen: en latte,
--  der er bestilt til kl. 12.30, er kold kl. 12.35.
--  Isen har ikke engang et flueben — den laves i lugen, mens
--  gæsten står der.
--
--  Smørrebrødet er ALTID åbent og står ikke i listen; koden
--  tvinger det, fordi det er husets hovedvare.
--
--  ⚠️ INGEN "on conflict" — OG DET ER MED VILJE.
--  To udgaver faldt med 42P10 ("there is no unique or exclusion
--  constraint matching the ON CONFLICT specification"), først på
--  (noegle) og så på (lokation_id, noegle). Nøglen i den her
--  database er altså en tredje, og at gætte en gang til er spild
--  af ejerens tid. Opdatér-ellers-indsæt virker, uanset hvad
--  nøglen hedder: en linje mere kode og NUL antagelser.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Den kan køres igen — den sætter listen, den lægger ikke til.
-- ============================================================

do $$
declare
  ider jsonb;
  ramt int;
begin
  select jsonb_agg(id order by id) into ider
    from public.menu_kategorier
   where aktiv
     /* Isen kan ikke bestilles, uanset hvad der står her —
        gæstesiden filtrerer afdelingen fra. */
     and afdeling <> 'is'
     /* ⚠️ PÅ NAVN, IKKE PÅ ID: id'erne er serienumre, der afhænger
        af, hvilken rækkefølge filerne blev kørt i, og et forkert
        id ville åbne en HELT anden kategori. */
     and navn in ('Retter', 'Sandwich og retter fra pladen',
                  'Burgere og sandwich', 'Pølser', 'Morgenmad',
                  'Øl', 'Vin, cava og champagne',
                  'Sodavand, juice og kakao', 'Snacks og slik');

  if ider is null then
    raise exception 'Fandt ingen af de ni kategorier. Er du i det rigtige projekt? '
      'Der skal staa epwyjzakvvbxtpvnhvbn i adresselinjen.';
  end if;

  update public.indstillinger
     set vaerdi = ider
   where noegle = 'bestilbare_kategorier';
  get diagnostics ramt = row_count;

  if ramt = 0 then
    /* Ingen række at rette — så skal den oprettes. Kolonnen
       lokation_id kom med flerlejer.sql; findes den ikke, er det
       en gammel database, og så skrives der uden. */
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'indstillinger'
                  and column_name = 'lokation_id') then
      insert into public.indstillinger (lokation_id, noegle, vaerdi)
      values ('mosede', 'bestilbare_kategorier', ider);
    else
      insert into public.indstillinger (noegle, vaerdi)
      values ('bestilbare_kategorier', ider);
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
--  RAPPORTEN: hvad blev åbnet, og hvad mangler stadig et menneske
-- ------------------------------------------------------------
select
  k.navn as aabnet,
  (select count(*) from public.menu_varer v
    where v.kategori_id = k.id and v.aktiv and v.pris is not null
      and not v.udsolgt)::text || ' varer kan bestilles' as status,
  case when (select count(*) from public.menu_varer v
              where v.kategori_id = k.id and v.aktiv and v.pris is null) > 0
       then '⚠️ ' || (select count(*) from public.menu_varer v
                       where v.kategori_id = k.id and v.aktiv and v.pris is null)::text
            || ' uden pris — de vises, men kan ikke lægges i kurven'
       else '' end as bemaerkning
  from public.menu_kategorier k
 where k.id in (select jsonb_array_elements_text(vaerdi)::int
                  from public.indstillinger where noegle = 'bestilbare_kategorier')
 union all
select '— MANGLER STADIG ET MENNESKE —', '', ''
 union all
select 'Facebook-adresse', 'admin → Kontakt', 'uden den ryger knappen af siden'
 union all
select 'Billeder til forsiden', 'admin → Forside',
       (select count(*)::text from public.indstillinger
         where noegle like 'foto_%' and vaerdi #>> '{}' <> '') || ' lagt op'
 union all
select 'Et kommende arrangement', 'admin → Kalender',
       (select count(*)::text from public.kalender
         where type = 'arrangement' and offentlig and dato >= current_date)
       || ' offentlige';
