-- ============================================================
--  DEN GLUTENFRI VAFFEL KOSTER DET SAMME  (25. september 2026)
-- ============================================================
--  Mikkels ord, ordret: *"den er samme pris, glutenfri vaffel."*
--
--  Kort 05 IS & SØDT skriver det samme: *"Alle kugler og al
--  softice kan fås i glutenfri vaffel — samme pris som almindelig
--  vaffel."* Databasen tog 3 kroner ekstra på alle seks. En gæst,
--  der læste kortet og valgte glutenfri, fik 3 kroner mere på
--  regningen, end kortet lovede — på hver eneste is.
--
--  ⚠️ HVORDAN DET BLEV FUNDET. Sætningen stod som en PÅSTAND i
--  vaerktoej/kortene.py — altså noget, rapporten ikke kunne måle
--  — og derfor så ingen den i tre uger. Den KAN måles: den
--  glutenfri vaffel er et valg, og "samme pris" er tillæg 0. Da
--  den blev flyttet fra påstand til måling, kom alle seks frem
--  med det samme. En påstand, der kan måles, hører ikke i en
--  liste over det, ejeren selv skal huske at tjekke.
--
--  ⚠️ FILEN FJERNER TILLÆGGET, IKKE VALGET. Gæsten skal stadig
--  kunne vælge glutenfri vaffel — det er dét, kortet lover. Et
--  valg uden tillæg skrives som en almindelig streng, præcis som
--  "Vaffel" og "Bæger" (se supabase/vare-valg.sql: både "Kebab"
--  og {"navn": "Kebab"} er det samme valg, og mosede_valg_navn
--  læser begge).
--
--  ⚠️ OG DEN RØRER IKKE SMØRREBRØDETS TILLÆG. De 10 kroner for
--  glutenfrit, laktosefrit og vegansk (supabase/tillaeg-hensyn.sql)
--  er en anden mekanisme og et andet løfte — kortet siger 5 kr.
--  for glutenfrit brød til smørrebrød, og dét tal er ikke det her.
--  Filen her rammer KUN valg, der hedder "Glutenfri vaffel".
--
--  ⚠️ DEN MATCHER PÅ NAVN, ALDRIG PÅ ID, og den kan køres igen:
--  `where valg::text like ...` rammer ingenting, når tillægget er
--  væk.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- ------------------------------------------------------------
--  0) SKRIV SOM EJEREN — ELLERS DØR FILEN TAVST
--     ---------------------------------------------------------
--     ⚠️ MÅLT 25/9 på en lokal Postgres bygget af mappens egne
--     filer: uden det her dør filen på den første række med
--     `kun_ejeren_saetter_priser`, hele transaktionen afbrydes, og
--     der kommer IKKE én rapportlinje ud. Den ligner ikke en fejl
--     — den ligner ingenting.
--
--     Et tillæg på et valg ER en pris, og `roller.sql` lagde 2/9
--     udløseren `menu_vare_pris_ejer` på menu_varer: kun en EJER må
--     rette den. Værnet spørger `auth.jwt()` og ikke databaserollen
--     — så heller ikke `postgres` i Supabases SQL Editor slipper
--     igennem. Husets ældste ar; kortene-25-9.sql faldt i det 24/9.
--
--     ⚠️ E-MAILEN LÆSES AF `admin_adgang`, den skrives ikke af. Et
--     navn i filen ville holde op med at virke den dag, ejeren
--     skifter sin e-mail — og det ville være tavst.
-- ------------------------------------------------------------
do $$
declare v_ejer text;
begin
  select a.email into v_ejer
    from public.admin_adgang a
   where a.lokation_id = 'mosede' and a.aktiv and a.rolle = 'ejer'
   order by a.email limit 1;

  if v_ejer is null then
    raise exception 'Ingen aktiv ejer i admin_adgang for mosede — filen kan ikke rette tillaegget. Opret ejeren under admin -> Personale foerst.';
  end if;

  perform set_config('request.jwt.claims',
                     json_build_object('email', v_ejer)::text, true);
end $$;

-- ------------------------------------------------------------
--  1) HVOR MANGE ER DER? En opdatering, der rammer nul rækker,
--     fejler ikke — den er bare tavs. Målt 25/9 i produktionen:
--     seks varer (1-4 kugler, softice lille og stor). Er der
--     pludselig nul, er noget andet galt, og så skal filen sige
--     det i stedet for at melde "færdig".
-- ------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n
    from public.menu_varer mv
    join public.menu_kategorier mk on mk.id = mv.kategori_id
   where mk.lokation_id = 'mosede'
     and exists (
       select 1 from jsonb_array_elements(
         case when jsonb_typeof(mv.valg) = 'array' then mv.valg else '[]'::jsonb end) x
        where jsonb_typeof(x) = 'object'
          and x->>'navn' = 'Glutenfri vaffel'
          and coalesce((x->>'tillaeg')::numeric, 0) <> 0);
  raise notice 'Varer med et tillæg på den glutenfri vaffel: %', n;
end $$;

-- ------------------------------------------------------------
--  2) TILLÆGGET VÆK — VALGET BLIVER
--     ---------------------------------------------------------
--     Listen bygges om element for element: er elementet den
--     glutenfri vaffel MED et tillæg, bliver det til den bare
--     streng; alt andet står, som det stod. Rækkefølgen holdes
--     med `ordinality`, så vaflen ikke pludselig står under
--     bægeret på gæstens skærm.
-- ------------------------------------------------------------
/* ⚠️ ET SKALART UNDERSPØRGSMÅL, IKKE ET LATERAL. Første udgave
   skrev `from ... , lateral (...)` og fejlede på en lokal Postgres
   med "invalid reference to FROM-clause entry for table mv": et
   LATERAL i en UPDATE's FROM kan IKKE se den tabel, der skrives i.
   Et underspørgsmål i SET kan. Målt 25/9 — filen så rigtig ud og
   rørte ingenting. */
update public.menu_varer mv
   set valg = (
         select jsonb_agg(
                  case
                    when jsonb_typeof(x.v) = 'object'
                     and x.v->>'navn' = 'Glutenfri vaffel'
                    then to_jsonb('Glutenfri vaffel'::text)
                    else x.v
                  end
                  order by x.nr)
           from jsonb_array_elements(
                  case when jsonb_typeof(mv.valg) = 'array'
                       then mv.valg else '[]'::jsonb end)
                with ordinality as x(v, nr))
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and exists (
     select 1 from jsonb_array_elements(
       case when jsonb_typeof(mv.valg) = 'array' then mv.valg else '[]'::jsonb end) y
      where jsonb_typeof(y) = 'object'
        and y->>'navn' = 'Glutenfri vaffel'
        and coalesce((y->>'tillaeg')::numeric, 0) <> 0);

commit;


-- ------------------------------------------------------------
--  RAPPORT. Supabases SQL Editor viser kun den SIDSTE sætnings
--  svar — derfor ét select til sidst.
--
--  `tilbage_med_tillaeg` SKAL være 0, og `kan_stadig_vaelges`
--  skal være 6: valget må ikke være forsvundet sammen med
--  tillægget. Det er dét, kortet lover gæsten.
-- ------------------------------------------------------------
select
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and exists (select 1 from jsonb_array_elements(
            case when jsonb_typeof(mv.valg) = 'array' then mv.valg else '[]'::jsonb end) x
           where jsonb_typeof(x) = 'object'
             and x->>'navn' = 'Glutenfri vaffel'
             and coalesce((x->>'tillaeg')::numeric, 0) <> 0))
                                                    as tilbage_med_tillaeg_skal_vaere_0,
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and exists (select 1 from jsonb_array_elements(
            case when jsonb_typeof(mv.valg) = 'array' then mv.valg else '[]'::jsonb end) x
           where public.mosede_valg_navn(x) = 'Glutenfri vaffel'))
                                                    as kan_stadig_vaelges,
  'Kør derefter: vaerktoej/hent-menukort.sh og vaerktoej/sammenlign-kort.py'
                                                    as naeste_skridt;
