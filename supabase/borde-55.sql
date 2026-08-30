/* ============================================================
   DE 55 BORDE  (30/8-2026)
   ------------------------------------------------------------
   Ejeren har oplyst, at der er 55 borde, og hvert bord skal have
   sit eget skilt med sin egen QR-kode. Skiltene tegnes af
   print/bordkort.html ud fra DENNE tabel — bordene er data, ikke
   kode, netop fordi de ændrer sig.

   Folden på Borde-fanen kan det samme (fra-nummer, til-nummer,
   forstavelse). Filen her er den anden vej ind, for den, der
   sidder i Supabase i forvejen. Resultatet er det samme.

   ------------------------------------------------------------
   ⚠️ DEN OPFINDER INGENTING
   ------------------------------------------------------------
   Vi ved, at der er 55 borde. Vi ved IKKE, hvor mange der kan
   sidde ved hvert, om de står ude eller inde, eller hvad zonerne
   hedder. Derfor sættes kun NUMMERET og rækkefølgen:

     pladser    → null. Et gæt her bliver til et løfte i en
                  bordbestilling ("der er plads til 4"), og
                  dagens billede på Borde-fanen ville regne på
                  et tal, ingen har sagt. Skiltet skriver
                  hverken pladser eller ude/inde, når feltet er
                  tomt — se print/bordkort.html.
     zone       → null. Zonen bestemmer, hvordan skiltene
                  bunkes, og hvordan Køkken-kø kan filtreres.
                  "Molen" og "Terrassen" er navne, ejeren skal
                  give, ikke navne, vi finder på.

   Begge dele sættes i admin → Borde, bord for bord, når ejeren
   har svaret. Indtil da står skiltet med nummeret alene, og det
   er det, der skal til for at bestille.

   ------------------------------------------------------------
   ⚠️ DEN KAN KØRES IGEN
   ------------------------------------------------------------
   Findes bordet i forvejen, springes det over — den unikke
   nøgle er (lokation_id, lower(btrim(nummer))). Ejeren kan
   altså have rettet pladser og zoner på bord 1-20 og køre filen
   igen for at få resten: hans rettelser bliver stående.

   ⚠️ OG DEN SLETTER INGENTING. Demo-bordene ("DEMO 7" og de to
   andre) står stadig bagefter, og de kommer med på arkene og i
   køkkenets kø. De ryddes af supabase/ryd-demo.sql, som tager
   hele demo-indholdet under ét — bordene alene ville efterlade
   demo-bestillingerne til et bord, der ikke findes. Rapporten
   nederst siger til, hvis der stadig står nogen.

   KØR DEN I MOSEDE-PROJEKTET (epwyjzakvvbxtpvnhvbn — tjek
   projekt-id'et i adresselinjen!). Kør bordkort.sql først, hvis
   tabellen ikke findes endnu.
   ============================================================ */

begin;

/* Forkert forretning er den ene fejl, filen skal standse på. En
   fil, der opretter 55 borde i en anden cafes database, er ikke
   til at rydde op i bagefter. */
do $$
begin
  if not exists (select 1 from public.lokationer where id = 'mosede') then
    raise exception 'Forretningen "mosede" findes ikke i den her database. '
      'Er du i det rigtige Supabase-projekt? Mosede er epwyjzakvvbxtpvnhvbn.';
  end if;
end $$;

insert into public.borde (lokation_id, nummer, sortering)
select 'mosede', n::text, n
  from generate_series(1, 55) as n
on conflict (lokation_id, lower(btrim(nummer))) do nothing;

commit;

/* Supabases SQL Editor viser kun den SIDSTE sætnings svar — se
   README. Derfor en select til sidst i stedet for en notice. */
select
  case
    when (select count(*) from public.borde
           where lokation_id = 'mosede' and nummer ~ '^[0-9]+$'
             and nummer::int between 1 and 55) = 55
      then '✅ ALLE 55 BORDE STÅR I SYSTEMET'
    else '❌ DER MANGLER ' || (55 - (select count(*) from public.borde
           where lokation_id = 'mosede' and nummer ~ '^[0-9]+$'
             and nummer::int between 1 and 55))::text || ' — kør filen igen'
  end as resultat,

  (select count(*) from public.borde where lokation_id = 'mosede') as borde_i_alt,

  case
    when exists (select 1 from public.borde
                  where lokation_id = 'mosede' and nummer like 'DEMO %')
      then '⚠️ DER STÅR STADIG DEMO-BORDE — kør supabase/ryd-demo.sql, '
           'ellers kommer de med på skiltene og i køkkenets kø'
    else 'Ingen demo-borde tilbage'
  end as demo,

  case
    when (select count(*) from public.borde
           where lokation_id = 'mosede' and pladser is not null) = 0
      then 'Pladser og zoner er tomme med vilje — sæt dem i admin → Borde, '
           'når ejeren har svaret. Skiltet virker uden dem'
    else 'Nogle borde har pladser sat — de er ikke rørt'
  end as naeste_skridt;
