-- ============================================================
--  VALG PÅ EN VARE ER DATA — IKKE EN SÆTNING I NAVNET  (15. sep 2026)
--  ------------------------------------------------------------
--  Kundens ord: "vi skal lave det mest dygtige og fejlfri system".
--  Gennemgangen talte ~30 varer, hvor valget stod i NAVNET eller i
--  BESKRIVELSEN: "Pitabrød — med kebab, kylling eller tun", "Lumumba —
--  kold eller varm", "Dåse eller flaske sodavand". Gæsten kunne ikke
--  vælge, og køkkenet fik "2 × Pitabrød" og måtte ringe og spørge.
--
--  Kolonnen menu_varer.valg er en LISTE af valgmuligheder. Hvert valg
--  er sin egen linje i kurven og på bonen (linjens `variant`, som
--  huset har haft siden 30/8), med sin egen tæller.
--
--  ⚠️ ET VALG KAN KOSTE EKSTRA  (rettet 20. sep 2026)
--     Her stod indtil i dag: "PRISEN er varens — et valg koster ikke
--     ekstra". Det trykte is-kort siger noget andet, og det er ejerens
--     kort: "alle kugler og al softice kan fås i glutenfri vaffel
--     +3,-". Hjemmesiden opkrævede dem ikke.
--
--     Et valg er derfor enten en STRENG ("Kebab") eller et OBJEKT
--     ({"navn": "Glutenfri vaffel", "tillaeg": 3}). Begge former skal
--     kunne læses for altid: kun isen har tillæg, resten af kortet er
--     strenge, og en fane, der har ligget åben siden i går, kender kun
--     den gamle form.
--
--     Navnet og tillægget læses ÉT sted — mosede_valg_navn og
--     mosede_valg_tillaeg her i filen. Værnene nedenfor og i
--     gaestens-regler.sql går begge gennem dem, så databasen og siden
--     ikke kan blive uenige om, hvad gæsten pegede på.
--
--     (Et tillæg kan stadig være sin egen vare, fx "Ekstra kugle 10",
--     når det er noget, man lægger OVENPÅ. Tillægget her er en anden
--     slags: samme vare, anden udgave, én pris.)
--
--  ⚠️ INGEN VARE FÅR VALG AF DEN HER FIL. Listerne er ejerens: admin
--     viser et forslag pr. vare, og ejeren trykker "Brug forslaget".
--     En fil, der satte valgene, ville ændre, hvad gæsten skal svare
--     på, uden at ejeren har set det.
--
--  ⚠️ OG DATABASEN HOLDER VALGET: har en vare valg, skal gæstens linje
--     have et af dem (gaestens-regler.sql kender kolonnen fra nu af).
--     Uden det kunne en gammel fane sende "Pitabrød" uden fyld, og så
--     står køkkenet og gætter igen.
--
--  Kan køres igen. Prøven er proev-vare-valg.sql.
-- ============================================================
begin;

alter table public.menu_varer add column if not exists valg jsonb;

-- ------------------------------------------------------------
--  NAVNET PÅ ET VALG — ÉT STED  (20/9)
--  Både "Kebab" og {"navn": "Kebab"} er det samme valg. Alle, der
--  skal vide, hvad et valg HEDDER, spørger her: værnet for det
--  manglende valg, prisværnet og CHECK'en nedenfor. Tre steder, der
--  hver pillede formen fra hinanden, ville skride fra hinanden.
-- ------------------------------------------------------------
create or replace function public.mosede_valg_navn(x jsonb)
returns text language sql immutable set search_path = ''
as $$
  select btrim(case
    when jsonb_typeof(x) = 'object' then coalesce(x ->> 'navn', '')
    when jsonb_typeof(x) = 'string' then coalesce(x #>> '{}', '')
    else '' end);
$$;

comment on function public.mosede_valg_navn(jsonb) is
  'Navnet på et valg, uanset om det er en streng eller et objekt med tillæg (20/9).';

-- ------------------------------------------------------------
--  TILLÆGGET FOR ET VALG  (20/9)
--  Svarer 0, når valget ikke findes, ikke har tillæg, eller listen
--  slet ikke er en liste — så en vare uden tillæg regnes præcis som
--  før. ⚠️ Kun tillæg > 0: et negativt tal ville være en rabat,
--  ingen har sat, og den ville ramme kassen uden at stå nogen steder.
-- ------------------------------------------------------------
create or replace function public.mosede_valg_tillaeg(valg jsonb, variant text)
returns numeric language sql immutable set search_path = ''
as $$
  select coalesce((
    select case when jsonb_typeof(x -> 'tillaeg') = 'number'
                 and (x ->> 'tillaeg')::numeric > 0
                then (x ->> 'tillaeg')::numeric else 0 end
      from jsonb_array_elements(
             case when jsonb_typeof(valg) = 'array' then valg else '[]'::jsonb end) x
     where btrim(coalesce(variant, '')) <> ''
       and lower(public.mosede_valg_navn(x)) = lower(btrim(coalesce(variant, '')))
     limit 1), 0);
$$;

comment on function public.mosede_valg_tillaeg(jsonb, text) is
  'Hvad et valg koster oveni varens pris — 0, når det ikke koster noget (20/9).';

-- ------------------------------------------------------------
--  ET AFTRYK AF TILLÆGGENE  (20/9)
--  Prisværnet (roller.sql) skal kunne se, om nogen ændrede PENGENE i
--  valglisten — og kun det. En medarbejder må gerne rette "Kebab" til
--  "Kebabfyld"; det er kortets tekst, som hun også må rette alle
--  andre steder. Hun må ikke sætte den glutenfri vaffel til 500.
--  Aftrykket er derfor kun navn=tillæg for dem, der KOSTER noget,
--  sorteret, så en omrokering af listen ikke ligner en prisændring.
-- ------------------------------------------------------------
create or replace function public.mosede_valg_tillaeg_aftryk(valg jsonb)
returns text language sql immutable set search_path = ''
as $$
  select coalesce(string_agg(t.navn || '=' || t.tillaeg, '|' order by t.navn), '')
    from (
      select lower(public.mosede_valg_navn(x)) as navn,
             case when jsonb_typeof(x -> 'tillaeg') = 'number'
                    and (x ->> 'tillaeg')::numeric > 0
                  then (x ->> 'tillaeg')::numeric else 0 end as tillaeg
        from jsonb_array_elements(
               case when jsonb_typeof(valg) = 'array' then valg else '[]'::jsonb end) x
    ) t
   where t.tillaeg > 0;
$$;

comment on function public.mosede_valg_tillaeg_aftryk(jsonb) is
  'Kun pengene i en valgliste, sorteret — så prisværnet kan se en prisændring og ikke en omdøbning (20/9).';

-- ------------------------------------------------------------
--  ER LISTEN BRUGBAR?  (20/9)
--  ⚠️ En CHECK må ikke indeholde en underforespørgsel, og listen skal
--  pilles fra hinanden for at måles — derfor en funktion.
--  Et valg uden navn er det farlige tilfælde: siden filtrerer det
--  tomme navn fra, og står der så under to tilbage, forsvinder HELE
--  valget, og varen får en almindelig tæller igen. Gæsten kan
--  bestille uden at vælge, og køkkenet gætter — præcis det, kolonnen
--  blev lavet for at stoppe. Det skal afvises ved døren, ikke tie.
-- ------------------------------------------------------------
create or replace function public.mosede_valg_gyldig(valg jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select not exists (
    select 1 from jsonb_array_elements(valg) x
     where jsonb_typeof(x) not in ('string', 'object')
        or public.mosede_valg_navn(x) = ''
        or (jsonb_typeof(x) = 'object' and x ? 'tillaeg'
            and (jsonb_typeof(x -> 'tillaeg') <> 'number'
                 or (x ->> 'tillaeg')::numeric < 0)));
$$;

/* ⚠️ CHECK'en laves om (20/9), så objektformen kan komme ind: den
   gamle målte kun længde og antal. Den droppes og sættes igen — alle
   nuværende rækker er strenge og går lige igennem.
   Og grænsen hæves fra 600 til 1200 tegn: {"navn":"Glutenfri
   vaffel","tillaeg":3} fylder tre gange så meget som "Kebab", og 12
   af dem ville sprænge 600 uden at nogen havde gjort noget forkert. */
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'vare_valg_ok') then
    alter table public.menu_varer drop constraint vare_valg_ok;
  end if;
  alter table public.menu_varer add constraint vare_valg_ok check (
    valg is null
    or (jsonb_typeof(valg) = 'array'
        and jsonb_array_length(valg) between 2 and 12
        and length(valg::text) <= 1200
        and public.mosede_valg_gyldig(valg)));
end $$;

commit;

select 'menu_varer.valg findes' as tjek,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'menu_varer'
                  and column_name = 'valg') as ok
union all
select 'valg er en liste med 2-12 muligheder',
       exists (select 1 from pg_constraint where conname = 'vare_valg_ok')
union all
-- ⚠️ to_regprocedure, ikke to_regproc: den sidste tager et navn uden
--    argumenter og svarer NULL på en signatur (målt 20/9).
select 'navnet på et valg læses ét sted',
       to_regprocedure('public.mosede_valg_navn(jsonb)') is not null
union all
select 'tillægget på et valg læses ét sted',
       to_regprocedure('public.mosede_valg_tillaeg(jsonb, text)') is not null
union all
-- Begge former skal give det samme navn, ellers ville en isbestilling
-- blive afvist som "mangler valg". Målt, ikke antaget.
select 'begge former læses ens',
       public.mosede_valg_navn('"Kebab"'::jsonb) = 'Kebab'
   and public.mosede_valg_navn('{"navn":"Kebab"}'::jsonb) = 'Kebab'
union all
select 'tillægget findes, og er 0 uden valg',
       public.mosede_valg_tillaeg('[{"navn":"Glutenfri vaffel","tillaeg":3}]'::jsonb,
                                  'glutenfri vaffel') = 3
   and public.mosede_valg_tillaeg('["Vaffel","Bæger"]'::jsonb, 'Vaffel') = 0
   and public.mosede_valg_tillaeg(null, 'Vaffel') = 0;
