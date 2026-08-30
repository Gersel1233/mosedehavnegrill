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
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Den kan køres igen — den sætter listen, den lægger ikke til.
-- ============================================================

begin;

/* Standser hellere end at skrive i den forkerte forretning. Det
   er sket én gang i det her projekt (spiis' setup.sql kørt i
   Mosede-projektet 18/8), og det tog en oprydningsfil at komme ud
   af igen. */
do $$
begin
  if not exists (select 1 from public.lokationer where id = 'mosede') then
    raise exception 'Forretningen "mosede" findes ikke i den her database. '
      'Er du i det rigtige projekt? Der skal staa epwyjzakvvbxtpvnhvbn i adresselinjen.';
  end if;
end $$;

with foreslaaet(navn, grund) as (values
  ('Retter',                        'stjerneskud, fish''n''chips, pariserbøf — laves på bestilling i forvejen'),
  ('Sandwich og retter fra pladen', 'samme'),
  ('Burgere og sandwich',           'samme — men det er dem, der presser en travl frokost'),
  ('Pølser',                        'hurtige, og de holder til at stå fem minutter'),
  ('Morgenmad',                     'ejerens eget kort: "Morgenbrød kan bestilles — sig til dagen før"'),
  ('Øl',                            'maden skal have noget at drikke til'),
  ('Vin, cava og champagne',        'samme'),
  ('Sodavand, juice og kakao',      'samme'),
  ('Snacks og slik',                'samme')
),
valgte as (
  /* ⚠️ SLÅS OP PÅ NAVN, IKKE PÅ ID. Kategori-id'erne er
     serienumre, der afhænger af, hvilken rækkefølge filerne blev
     kørt i — og et forkert id ville åbne en HELT anden kategori,
     uden at nogen kunne se det. Navnet er ejerens eget. */
  select k.id, k.navn, f.grund
    from public.menu_kategorier k
    join foreslaaet f on f.navn = k.navn
   where k.aktiv
     /* Isen kan ikke bestilles, uanset hvad der står her —
        gæstesiden filtrerer afdelingen fra. Stod den på listen,
        ville nogen sætte fluebenet og bagefter lede efter fejlen
        på en side, der gør præcis det, den skal. */
     and k.afdeling <> 'is'
)
/* ⚠️ NØGLEN ER (lokation_id, noegle) — IKKE noegle alene.

   setup.sql linje 240 siger "noegle text primary key", og det var
   sandt indtil flerlejer.sql linje 231 lavede den om til en
   sammensat nøgle, så to forretninger kan have hver sin
   indstilling med samme navn. Den her fil faldt med
   "42P10: there is no unique or exclusion constraint matching the
   ON CONFLICT specification", fordi den troede på setup.sql.

   Læren er ikke "ret filen": det er at en efterligning bygget
   efter setup.sql ALENE er mildere end produktionen, hvor alle
   migrationerne er kørt oven på. Slår du noget op i setup.sql,
   så søg bagefter på tabelnavnet i de øvrige filer. */
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'mosede', 'bestilbare_kategorier',
       coalesce(jsonb_agg(id order by id), '[]'::jsonb)
  from valgte
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();

commit;

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
