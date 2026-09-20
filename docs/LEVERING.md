# Leveringen — officielle adresser og en grænse, der holder

Skrevet 20. september 2026. Læs den her, før du rører noget med
levering at gøre.

## Hvorfor den findes

Indtil 20/9 kunne en gæst skrive hvad som helst i adressefeltet.
Databasen kontrollerede kun, at der **stod** noget — fem til tre
hundrede tegn — og browseren kiggede efter det første firecifrede tal
i teksten. `"Aalborgvej 5, 2670"` gik igennem, og køkkenet fik en
adresse, ingen havde set på.

Samtidig manglede leveringen helt på forsiden. Indstillingen var slået
til, gebyret sat til 79 og de syv postnumre skrevet — men forsiden
spurgte kun "To-go eller Spis her". En burger, en is eller grillmad
kunne slet ikke bestilles til levering. Det var ejernes punkt nummer
ét.

## Kæden

```
gæsten skriver i adressefeltet
  → Dataforsyningen foreslår officielle adresser  (js/adressefelt.js)
  → gæsten VÆLGER en af dem
  → POST til Edge Function med DAWA's adresse-ID
  → serveren slår ID'et op hos Dataforsyningen IGEN
  → databasen afgør zonen                 (mosede_leveringszone)
  → kvittering skrives                    (leverings_valideringer)
  → token retur til browseren
  → bestillingen bærer tokenet
  → udløseren kræver det og OVERSKRIVER adressen
                                          (mosede_levering_valideret)
```

**Klientens adressefelt er aldrig autoritativt.** Sender nogen et
gyldigt token sammen med "En falsk adresse i Aalborg", ryger teksten
på gulvet, og køkkenet får den adresse, DAWA bekræftede. Det er målt i
`proev-levering-valideret.sql`, prøve 8 og 9.

## Filerne

| Fil | Hvad |
|---|---|
| `supabase/levering-zone.sql` | Geometrien og **grænsen**. Punkt-i-polygon i ren SQL |
| `supabase/levering-valideret.sql` | Kvitteringstabellen, RLS og udløseren på `bestillinger` |
| `supabase/funktioner/valider-levering.ts` | Edge Function: slår op hos DAWA, udsteder kvitteringen |
| `js/adressefelt.js` | Feltet med forslag, tastatur og ARIA |
| `css/adressefelt.css` | Forslagslisten og svarlinjen. Én fil, tre sider |
| `supabase/proev-levering-zone.sql` | 16 prøver på geometrien |
| `supabase/proev-levering-valideret.sql` | 14 prøver, heraf manipulationen |
| `tests/adressefelt.spec.js` | 14 prøver på det, gæsten ser |

Koblet på i `index.html`, `h-smorrebrod.html`, `bestil/index.html`,
`js/skal/bestil.js`, `js/bestilling.js` og `js/store.js`.

## A · Hvor grænsen ændres

**Ét sted:** indstillingen `leverings_zoner` i databasen.

```sql
update public.indstillinger
   set vaerdi = '{ "godkendt": true, "zoner": [ … ] }'::jsonb
 where lokation_id = 'mosede' and noegle = 'leverings_zoner';
```

Hvert punkt er `[længde, bredde]` i WGS84 — **de samme tal, Google
Maps viser, bare i omvendt rækkefølge af det, Maps skriver.**
Polygonen lukkes selv; første og sidste punkt behøver ikke være ens.

> ⚠️ **Polygonen, der ligger der nu, er IKKE godkendt.** Den er et
> arbejdsomrids om de byer, ejerne nævnte, og står med
> `"godkendt": false`. Den skal erstattes af ejernes egen grænse før
> lancering.

### Flere zoner

`zoner` er en **ordnet** liste. Første træffer vinder, så den
snævreste skal stå først. Hver zone har et `svar`:

- `"ja"` — der leveres
- `"spoerg"` — "længere ude efter aftale". Gæsten kan **ikke**
  bestille online; hun får telefonnummeret. Ejerens beslutning fra
  4/9: en levering, forretningen ikke kan køre, må ikke kunne sendes
- alt andet springes over — en tastefejl må ikke blive en
  leveringsaftale

Skal der senere være forskellige priser pr. zone, er det her, feltet
skal lægges. Geometrien behøver ikke røres.

## B · Hvor postnumrene ændres

Indstillingen `leverings_postnr`. Den er en **grov sigte** og bruges
af `js/bestil-regler.js` til at svare hurtigt, mens gæsten skriver.

> ⚠️ **Postnummeret afgør ingenting.** Polygonen er dommen. Et tilladt
> postnummer uden for grænsen bliver stadig afvist — det er prøve 7 i
> `proev-levering-zone.sql`.

## C · Sådan prøver du en adresse

```sql
select public.mosede_leveringszone(12.28463387, 55.5664776, 'mosede');
-- 'ja' · 'spoerg' · 'nej'
```

Koordinaterne henter du sådan her — bemærk `x` = længde, `y` = bredde:

```bash
curl -s "https://api.dataforsyningen.dk/adresser/autocomplete?q=Havnevej%2020&per_side=1" \
  | python3 -m json.tool
```

Hele kæden prøves med:

```bash
psql -d fuld -f supabase/proev-levering-zone.sql        # 16 prøver
psql -d fuld -f supabase/proev-levering-valideret.sql   # 14 prøver
npx playwright test tests/adressefelt.spec.js           # 14 prøver
```

## D · Hvis Dataforsyningen er nede

**Der udstedes ingen kvittering, og så kan der ikke bestilles
levering.** Gæsten får: *"Vi kunne ikke kontrollere leveringsadressen
lige nu. Prøv igen."*

Det er **fail closed**, og det er strengere end husets sædvanlige
regel om, at en bestilling ikke må møde sten på vejen (23/8). Det er
et bevidst valg: bedre at miste en levering i et kvarter end at køre
mad til en adresse, ingen har kontrolleret.

> ⚠️ **Det betyder tabt omsætning under et nedbrud.** Ejerne skal vide
> det. Afhentning og spis her rammes ikke.

Forslagene fejler derimod **blødt**: kan Dataforsyningen ikke foreslå
noget, sker der ingenting synligt, og siden går ikke i stykker.

## E · Miljøvariabler

Ingen nye. Edge Function'en bruger `SUPABASE_URL` og
`SUPABASE_SERVICE_ROLE_KEY`, som Supabase sætter selv.

**DAWA kræver ingen nøgle.** Det er et åbent, officielt dansk API med
`access-control-allow-origin: *` — målt 20/9 — så browseren må kalde
det direkte til forslagene. Selve valideringen går altid gennem
serveren.

## F · Hvad gæsten møder

| Tilstand | Tekst |
|---|---|
| Intet valgt | Vælg din adresse fra forslagene. |
| Kontrollerer | Vi kontrollerer adressen … |
| Inden for | ✓ Vi leverer til denne adresse. |
| Uden for | Vi leverer desværre ikke til denne adresse endnu. |
| Lige uden for | Vi kører ikke fast derud. Ring til os … |
| Ikke fundet | Vi kunne ikke finde adressen. Vælg en fra forslagene. |
| Tjenesten nede | Vi kunne ikke kontrollere leveringsadressen lige nu. |

Ingen tekniske koder. Hver tekst siger, hvad hun skal **gøre**.

## G · Rækkefølgen ved udgivelse

> ⚠️ **SQL FØRST, SÅ KODEN — OG ALDRIG KUN DEN ENE.**
>
> Udløseren kræver et token af enhver leveringsbestilling fra en gæst.
> Går den i luften **alene**, holder smørrebrødets og bestil/-sidens
> levering op med at virke i samme sekund, fordi de sender fri tekst
> uden token.
>
> Og går koden i luften uden udløseren, er der ingen kolonne at skrive
> tokenet i, og hver bestilling svarer PGRST204.

1. `supabase/levering-zone.sql`
2. `supabase/levering-valideret.sql`
3. Edge Function `valider-levering`
4. Push af koden

## H · Hvad der bevidst IKKE blev gjort

- **Ingen PostGIS.** Stråleskydning er tolv linjer SQL. En udvidelse,
  der skal slås til, holdes ved lige og prøves med, er dyrere end de
  tolv linjer
- **Ingen afstandscirkel.** En radius ville godkende en adresse i en
  retning, forretningen ikke kører til, bare fordi den ligger lige så
  langt væk som Tune
- **Ingen kopi af grænsen i browseren.** Den lå der et par timer 20/9
  og blev slettet igen: to kopier skrider fra hinanden, første gang
  ejeren flytter grænsen. Browseren spørger serveren
- **Ingen zonepriser endnu.** Strukturen kan bære dem; YAGNI indtil
  nogen beder om dem
