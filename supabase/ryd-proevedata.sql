-- ============================================================
--  RYD BYGGEPERIODENS PRØVEDATA — OG GØR DATABASEN KLAR TIL DRIFT
--  (6. september 2026)
-- ============================================================
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kundens ord: "kan vi lave en sql der rydder shittet og gør de
--  helt klar til brug."
--
--  ⚠️ KØR supabase/hvad-ligger-der.sql FØRST. Den skriver
--  ingenting og viser, hvad der står i tabellerne — og det er DEN
--  liste, datoen herunder skal sættes efter. En oprydning, der
--  gætter, er en oprydning, der sletter en gæsts bestilling.
--
--  ------------------------------------------------------------
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Lægger alt i de FEM gæstetabeller fra FØR skæringsdatoen i
--  SKRALDESPANDEN — bestillinger, bordbestillinger,
--  forespørgsler, udlejninger og reservationer.
--
--  ⚠️ DET ER IKKE EN SLETNING. Rækkerne får en dato i kolonnen
--  `slettet`, præcis som knappen "Slet" i admin gør det, og de
--  kan hentes tilbage i 30 dage under Historik. Det er husets
--  egen regel: intet må gå tabt, heller ikke når man rydder op.
--  Vil du have dem HELT væk bagefter, står der en linje nederst i
--  filen om det.
--
--  ------------------------------------------------------------
--  HVAD DEN ALDRIG RØRER
--  ------------------------------------------------------------
--  Menukortet, priserne, åbningstiderne, de 55 borde og deres
--  QR-nøgler, indstillingerne, kalenderen, nyhederne og
--  personalets adgang. Det ER opsætningen — det er dét, du gerne
--  vil BEHOLDE. En "ryd alt"-fil ville tage forretningen med, og
--  så skulle 262 varer skrives ind igen.
--
--  ⚠️ OG DEN RØRER IKKE DEMO-INDHOLDET. Det har sin egen fil,
--  supabase/ryd-demo.sql, som rammer på demo-referencerne i
--  stedet for på en dato — kør den, hvis rapporten siger, der er
--  demo-rækker.
--
--  ------------------------------------------------------------
--  DEN KAN KØRES IGEN
--  ------------------------------------------------------------
--  En række, der allerede ligger i skraldespanden, røres ikke
--  (`slettet is null` i hver eneste sætning). Kører du filen to
--  gange, siger rapporten 0 den anden gang — den flytter ikke
--  datoen på noget, du selv har slettet i mellemtiden.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  SKÆRINGSDATOEN — DEN ENE TING, DU SKAL SÆTTE
--  ------------------------------------------------------------
--  Alt FØR den her dato ryger i skraldespanden. Datoen SELV og
--  alt efter den bliver stående.
--
--  ⚠️ FILEN STANDSER, HVIS DEN IKKE ER RETTET. Pladsholderen
--  herunder er med vilje en umulig dato: en oprydningsfil, der
--  kunne køres ved et uheld på sin standardværdi, er præcis den
--  slags uheld, `lokal-stub.sql` og `setup.sql` har hver sin
--  spærre imod.
-- ------------------------------------------------------------
create temporary table proeve_skaering on commit drop as
select date '1970-01-01' as foer;      -- ← RET DEN HER

do $$
declare d date;
begin
  select foer into d from proeve_skaering;
  if d = date '1970-01-01' then
    raise exception
      'Skæringsdatoen er ikke sat. Kør supabase/hvad-ligger-der.sql først, '
      'find den dag hvor din prøvning holdt op, og skriv den i linjen '
      '"select date ''1970-01-01'' as foer" øverst i filen.';
  end if;
  if d > current_date then
    raise exception
      'Skæringsdatoen (%) ligger i FREMTIDEN. Så ville hver eneste '
      'bestilling ryge i skraldespanden, ogsaa dem der kommer i dag.', d;
  end if;
end $$;

-- ------------------------------------------------------------
--  FØR-TALLENE, så rapporten kan sige hvor meget der blev flyttet
-- ------------------------------------------------------------
create temporary table proeve_foer on commit drop as
select 'bestillinger' as tabel,
       count(*) filter (where slettet is null) as levende
  from public.bestillinger where lokation_id = 'mosede'
union all select 'bordbestillinger', count(*) filter (where slettet is null)
  from public.bordbestillinger where lokation_id = 'mosede'
union all select 'forespoergsler', count(*) filter (where slettet is null)
  from public.forespoergsler where lokation_id = 'mosede'
union all select 'udlejninger', count(*) filter (where slettet is null)
  from public.udlejninger where lokation_id = 'mosede'
union all select 'reservationer', count(*) filter (where slettet is null)
  from public.reservationer where lokation_id = 'mosede';

-- ------------------------------------------------------------
--  I SKRALDESPANDEN
--  ------------------------------------------------------------
--  ⚠️ HVER TABEL HAR SIN EGEN DATOKOLONNE, og de betyder ikke det
--  samme. Bestillinger og borde har den dag, maden skal hentes
--  eller bordet står klar (`hent_dato` / `dato`) — dét er dagen,
--  personalet tænker i. Forespørgsler og reservationer har kun
--  `oprettet`: deres egen dato er et ØNSKE, som kan ligge langt
--  ude i fremtiden, og en forespørgsel om et selskab til november,
--  du sendte som prøve i august, skal ryge med.
-- ------------------------------------------------------------
update public.bestillinger set slettet = now()
 where lokation_id = 'mosede' and slettet is null
   and hent_dato < (select foer from proeve_skaering);

update public.bordbestillinger set slettet = now()
 where lokation_id = 'mosede' and slettet is null
   and dato < (select foer from proeve_skaering);

update public.udlejninger set slettet = now()
 where lokation_id = 'mosede' and slettet is null
   and dato < (select foer from proeve_skaering);

update public.forespoergsler set slettet = now()
 where lokation_id = 'mosede' and slettet is null
   and oprettet < (select foer from proeve_skaering);

update public.reservationer set slettet = now()
 where lokation_id = 'mosede' and slettet is null
   and oprettet < (select foer from proeve_skaering);

-- ------------------------------------------------------------
--  LOGBOGEN
--  ------------------------------------------------------------
--  Byggeperiodens linjer handler om rækker, der nu ligger i
--  skraldespanden. De SLETTES rigtigt og ikke til en spand:
--  logbogen er selv arkivet, og et arkiv over et arkiv er ikke en
--  oplysning, nogen kommer til at bruge.
--
--  ⚠️ Og den er ejerens redskab (roller.sql, 2/9) — en
--  medarbejder kan ikke læse den. Derfor er der ingen, der mister
--  noget ved, at byggeperioden ryger.
-- ------------------------------------------------------------
create temporary table proeve_log on commit drop as
select count(*) as fjernet from public.logbog
 where lokation_id = 'mosede'
   and hvornaar < (select foer from proeve_skaering);

delete from public.logbog
 where lokation_id = 'mosede'
   and hvornaar < (select foer from proeve_skaering);

-- ------------------------------------------------------------
--  NUMRENE BEGYNDER FORFRA
--  ------------------------------------------------------------
--  "Helt klar til brug" er også, at den første RIGTIGE bestilling
--  hedder #0001 og ikke #0053. Tællerne sættes til 0, så det
--  næste nummer bliver 1.
--
--  ⚠️ KUN NÅR DER IKKE ER LEVENDE RÆKKER TILBAGE. Er der en
--  bestilling fra en rigtig gæst i systemet, HAR den et nummer —
--  og en nulstilling ville give den næste det samme tal. Der er
--  med vilje ingen unique på kolonnen (bestillingsnummer.sql:
--  et sammenstød skal give to kort med samme tal og ikke en
--  AFVIST bestilling), så databasen ville ikke sige fra. Derfor
--  siger vi selv fra her.
-- ------------------------------------------------------------
update public.bestillingsnumre set naeste = 0
 where lokation_id = 'mosede'
   and not exists (select 1 from public.bestillinger
                    where lokation_id = 'mosede' and slettet is null);

update public.bordnumre set naeste = 0
 where lokation_id = 'mosede'
   and not exists (select 1 from public.bordbestillinger
                    where lokation_id = 'mosede' and slettet is null);

-- ------------------------------------------------------------
--  RAPPORTEN — den SIDSTE sætning, for Supabases editor viser
--  kun den. Se noten i CLAUDE.md om SQL Editoren.
-- ------------------------------------------------------------
select afsnit, linje from (
  select 0 as sorter, '── RYDDET ──' as afsnit,
    'skæringsdato: ' || (select foer::text from proeve_skaering)
    || ' · alt FØR den ligger nu i skraldespanden' as linje

  union all
  select 1, f.tabel,
    (f.levende - n.levende)::text || ' flyttet til skraldespanden · '
    || n.levende::text || ' står tilbage'
    from proeve_foer f
    join (
      select 'bestillinger' as tabel,
             count(*) filter (where slettet is null) as levende
        from public.bestillinger where lokation_id = 'mosede'
      union all select 'bordbestillinger', count(*) filter (where slettet is null)
        from public.bordbestillinger where lokation_id = 'mosede'
      union all select 'forespoergsler', count(*) filter (where slettet is null)
        from public.forespoergsler where lokation_id = 'mosede'
      union all select 'udlejninger', count(*) filter (where slettet is null)
        from public.udlejninger where lokation_id = 'mosede'
      union all select 'reservationer', count(*) filter (where slettet is null)
        from public.reservationer where lokation_id = 'mosede'
    ) n on n.tabel = f.tabel

  union all select 2, 'logbog',
    (select fjernet from proeve_log)::text || ' linjer slettet (ikke til spanden)'

  union all select 3, 'næste numre',
    'bestilling #' || lpad(((select coalesce(naeste, 0) from public.bestillingsnumre
                              where lokation_id = 'mosede') + 1)::text, 4, '0')
    || ' · booking #' || lpad(((select coalesce(naeste, 0) from public.bordnumre
                                 where lokation_id = 'mosede') + 1)::text, 4, '0')

  union all select 4, '── URØRT ──',
    'menukort: ' || (select count(*) from public.menu_varer where lokation_id = 'mosede')
    || ' varer · borde: ' || (select count(*) from public.borde where lokation_id = 'mosede')
    || ' · åbningstider: ' || (select count(*) from public.aabningstider where lokation_id = 'mosede')
    || ' dage · indstillinger: ' || (select count(*) from public.indstillinger where lokation_id = 'mosede')
    || ' nøgler'

  union all select 5, '── FORTRYD ──',
    'Alt det flyttede står under Historik → Skraldespanden i 30 dage '
    || 'og kan hentes tilbage række for række.'
) r order by sorter, afsnit;

commit;

-- ============================================================
--  BAGEFTER: SKAL DET HELT VÆK?
--  ------------------------------------------------------------
--  Skraldespanden holder 30 dage. Vil du tømme den helt — fordi
--  prøvedata ikke skal ligge og fylde i et system, der er i drift
--  — så kør de fem linjer herunder MANUELT, én ad gangen, når du
--  har set på listen i admin og er sikker.
--
--  ⚠️ DE ER KOMMENTERET UD MED VILJE. En hård sletning kan ikke
--  fortrydes, og der er ingen grund til, at den sker i det samme
--  tryk som en oprydning, der kan.
-- ============================================================
-- delete from public.bestillinger     where lokation_id = 'mosede' and slettet is not null;
-- delete from public.bordbestillinger where lokation_id = 'mosede' and slettet is not null;
-- delete from public.forespoergsler   where lokation_id = 'mosede' and slettet is not null;
-- delete from public.udlejninger      where lokation_id = 'mosede' and slettet is not null;
-- delete from public.reservationer    where lokation_id = 'mosede' and slettet is not null;
