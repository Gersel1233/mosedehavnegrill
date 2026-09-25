-- ============================================================
--  DE SIDSTE HULLER MELLEM KORTENE OG SIDEN — 25. SEPTEMBER 2026
-- ============================================================
--  Mikkels ord: *"ja, hele bestillingssiden online skal matche
--  menukortene."*
--
--  `supabase/kortene-25-9.sql` rettede priserne og slukkede det,
--  kortene ikke viser. Tilbage stod en håndfuld poster, som
--  GÆSTEN KAN LÆSE PÅ ET TRYKT KORT, men ikke bestille på siden.
--  Målingen er `vaerktoej/sammenlign-kort.py` (afsnit A og D),
--  kørt mod produktionen med anon-nøglen.
--
--  ⚠️ KUN DET, KORTET SELV SIGER PRISEN PÅ. Fire poster er i
--  filen. Det, der kræver et svar fra Mikkel, står nederst og er
--  MED VILJE ikke med — et gæt på en pris er en gæst, der har
--  set ét tal og betaler et andet.
--
--  ⚠️ DEN MATCHER PÅ NAVN, ALDRIG PÅ ID. Id'erne herover gælder
--  produktionens rækkefølge; i en frisk database rammer de nul
--  rækker uden at fejle. Arret er `kortets-priser-2.sql` (1/9).
--
--  ⚠️ DEN KAN KØRES IGEN. Hver indsættelse har `not exists`, og
--  opdateringen har `is distinct from`. Et nyt gennemløb rører
--  ingenting. Der er ingen unik nøgle på (kategori, navn), så
--  `on conflict` findes ikke her — og en dublet er værre end en
--  manglende vare.
--
--  ⚠️ OG DEN SLETTER INTET.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- ------------------------------------------------------------
--  0) FINDES KATEGORIERNE? En indsættelse, der rammer nul
--     rækker, fejler ikke — den er bare tavs. Derfor spørges der
--     FØRST, og filen stopper, hvis en kategori mangler.
-- ------------------------------------------------------------
do $$
declare mangler text;
begin
  select string_agg(n.navn, ', ')
    into mangler
    from (values ('Smørrebrød'), ('Håndmadder'),
                 ('Sodavand, juice og kakao')) as n(navn)
   where not exists (
     select 1 from public.menu_kategorier mk
      where mk.lokation_id = 'mosede'
        and lower(btrim(mk.navn)) = lower(btrim(n.navn)));
  if mangler is not null then
    raise exception 'Kategorierne findes ikke: %. Kør supabase/setup.sql og kortene-25-9.sql først.', mangler;
  end if;
end $$;

-- ------------------------------------------------------------
--  1) TRE VARER, KORTENE VISER, OG SIDEN IKKE HAVDE
--     ---------------------------------------------------------
--     · "Dagens hjemmelavede pålægssalater" står på kort 03
--       SMØRREBRØD i 55-listen med ejerens egen note "Spørg ved
--       bestilling". Databasen havde i stedet fire navngivne
--       salater (hønse-, ægge-, wiener-, skinkesalat), som
--       kortene ikke længere viser. De SLUKKES IKKE her — se
--       spørgsmålet nederst.
--
--     · Samme linje står på kort 04 HÅNDMADDER. Prisen er 24 og
--       ikke kortets 27: Mikkels afgørelse 25/9, *"24 gælder —
--       kortbilledet er forkert"*, som alle 18 andre håndmadder
--       allerede følger. En ny vare til 27 ville være den eneste
--       håndmad på siden med en anden pris end resten.
--
--     · "Æggemad med mayo og rejer" FINDES i databasen — men kun
--       i kategorien "Vælg fyld til smørrebrødet", som blev
--       slukket 1/9, da smørrebrødet blev "1 mad er 1 mad". Altså
--       kan ingen bestille den, selv om kortet viser den til 55.
--       Den oprettes i Smørrebrød ved siden af de andre; den
--       slukkede kategori røres ikke.
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, pris, beskrivelse, sortering, aktiv)
select mk.id, n.navn, n.pris, n.beskrivelse,
       coalesce((select max(sortering) from public.menu_varer x
                  where x.kategori_id = mk.id), 0) + n.nr,
       true
  from (values
    ('Smørrebrød', 'Dagens hjemmelavede pålægssalater',            55, 'Spørg ved bestilling', 1),
    ('Smørrebrød', 'Æggemad med mayo og rejer',                    55, null,                   2),
    ('Håndmadder', 'Dagens hjemmelavede pålægssalater, håndmad',   24, 'Spørg ved bestilling', 3)
  ) as n(kategori, navn, pris, beskrivelse, nr)
  join public.menu_kategorier mk
    on mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = lower(btrim(n.kategori))
 where not exists (
   select 1 from public.menu_varer mv
    where mv.kategori_id = mk.id
      and lower(btrim(mv.navn)) = lower(btrim(n.navn)));

-- ------------------------------------------------------------
--  2) MILKSHAKEN ER IKKE EN VARE, DER MANGLER — DEN ER ET VALG
--     ---------------------------------------------------------
--     Kort 06 har TO linjer til 59: "Dagens smoothie" og
--     "Milkshake · valgfri smag, mix 2 kugler". Databasen har ÉN
--     vare, "Smoothie eller milkshake", til 59.
--
--     Prisen passer, og gæsten KAN bestille den — men bonen
--     siger "Smoothie eller milkshake", og så skal køkkenet gætte
--     eller spørge. Med et valg siger linjen, hvad der skal
--     laves, uden at der kommer to varer, der skal prisrettes
--     hver for sig (og skride fra hinanden den dag, kun den ene
--     bliver rettet).
--
--     Formen er den samme som kaffens Lille/Stor: en streng uden
--     tillæg koster grundprisen. Se js/store.js, Butik.prisMedValg.
-- ------------------------------------------------------------
update public.menu_varer mv
   set valg = '["Smoothie", "Milkshake"]'::jsonb
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and lower(btrim(mv.navn)) = 'smoothie eller milkshake'
   and mv.valg is distinct from '["Smoothie", "Milkshake"]'::jsonb;

commit;


-- ------------------------------------------------------------
--  RAPPORT. Supabases SQL Editor viser kun den SIDSTE sætnings
--  svar — derfor ét select til sidst og ikke fem undervejs.
-- ------------------------------------------------------------
select
  /* ⚠️ OG KATEGORIEN SKAL VÆRE TÆNDT. Første udgave talte kun
     mv.aktiv og svarede 4 under en overskrift, der lovede 3 —
     fordi "Æggemad med mayo og rejer" ogsaa staar i den SLUKKEDE
     kategori "Vælg fyld til smørrebrødet". En vare i en slukket
     kategori kan ingen bestille, saa den maa heller ikke taelles
     med i "det virker nu". Maalt paa en lokal Postgres 25/9. */
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and mv.navn in ('Dagens hjemmelavede pålægssalater',
                      'Æggemad med mayo og rejer',
                      'Dagens hjemmelavede pålægssalater, håndmad')
      and mv.aktiv and mk.aktiv)                      as nye_varer_skal_vaere_3,
  (select valg from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and lower(btrim(mv.navn)) = 'smoothie eller milkshake')
                                                      as milkshake_valg,
  'Kør derefter: vaerktoej/hent-menukort.sh og vaerktoej/sammenlign-kort.py'
                                                      as naeste_skridt;


-- ============================================================
--  DET, DER IKKE ER I FILEN — OG HVORFOR
--  ------------------------------------------------------------
--  Tre ting er målt, men de er BESLUTNINGER og ikke rettelser.
--  De står også i README under "Ejeren skal bekræfte".
--
--  1) DEN GLUTENFRI VAFFEL. Kort 05 skriver ordret: *"Alle
--     kugler og al softice kan fås i glutenfri vaffel — samme
--     pris som almindelig vaffel."* Databasen har `tillaeg: 3` på
--     alle seks (1-4 kugler, softice lille og stor). En gæst, der
--     læser kortet og vælger glutenfri, betaler 3 kroner mere,
--     end kortet lovede. Enten er kortet forkert, eller også er
--     tillægget — begge veje er Mikkels valg om penge og om
--     noget, der allerede er trykt.
--
--  2) "REJEMAD & TARTAR" PÅ HÅNDMADSKORTET. Kortet har linjen,
--     men INGEN pris ("Rejemad fås både på rugbrød og franskbrød.
--     Tartar fås som smørrebrød."). Rejemad og Tartarmad findes
--     som smørrebrød til 95. Hvad en HÅNDMAD med rejer eller
--     tartar koster, står ingen steder — og et gæt er en gæst,
--     der har set ét tal og betaler et andet.
--
--  3) DE FIRE NAVNGIVNE PÅLÆGSSALATER. Hønse-, ægge-, wiener- og
--     skinkesalat står i databasen til 55 (og som håndmad til
--     24), men de nye kort viser dem ikke længere — kortene har
--     én linje, "Dagens hjemmelavede pålægssalater". Skal de fire
--     slukkes, så siden siger det samme som kortet? Eller blive,
--     så gæsten kan bestille præcis den, hun vil have? De bliver
--     STÅENDE, indtil Mikkel svarer: at slukke fire varer, der
--     sælger, er ikke noget, en måling kan afgøre.
-- ============================================================
