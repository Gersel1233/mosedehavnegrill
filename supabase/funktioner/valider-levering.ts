/* ============================================================
   ⚠️⚠️  DEN HER FIL ER **IKKE** SQL  ⚠️⚠️
   ------------------------------------------------------------
   Sætter du den ind i Supabases SQL Editor, dør den på første
   linje. Den skal ind under **Edge Functions**, ikke SQL — hele
   opskriften står nedenfor under "SÅDAN LÆGGES DEN OP".

   Det er sket tre gange i huset før (lokal-stub.sql 1/9,
   hent-menukort.sh 3/9, send-push.ts 9/9), og hver gang fik filen
   en blok som den her bagefter.
   ============================================================

   EDGE FUNCTION: valider-levering   (20. sep 2026)
   ------------------------------------------------------------
   Den ANDEN kode i Mosede, der kører på en server. Alt andet er
   statiske filer, og browseren skriver direkte til Postgres.

   HVORFOR DEN FINDES
   Indtil nu kunne en gæst skrive hvad som helst i adressefeltet.
   Databasen kontrollerede kun, at der STOD noget, og browseren
   kiggede efter det første firecifrede tal i teksten. "Aalborgvej
   5, 2670" gik igennem.

   Nu slår SERVEREN adressen op hos statens adressetjeneste og
   udsteder en kvittering. Gæsten sender kvitteringens token med
   bestillingen, og udløseren i databasen (supabase/levering-
   valideret.sql) overskriver adressen med den, tjenesten bekræftede.

   ⚠️⚠️ DAWA LUKKEDE 1/10 2026 KL. 10 — OG LEVERINGEN DØDE TAVST.
   Klimadatastyrelsen lukkede api.dataforsyningen.dk; afløseren er
   Adressevælger (adressevaelger.dk). Mikkel 9/10: *"den kan ikke
   finde … nylandsvej 43 i karlslunde"*. Feltet fik intet svar og
   lukkede listen uden et ord, og serveren svarede fail closed —
   altså kunne INGEN bestille levering fra 1/10. Prøverne bestod
   hele vejen, fordi de kørte mod en efterligning af DAWA.
   Udgaven her (9/10) slår op hos Adressevælger. ID'erne er de
   samme (Havnevej 20 er 5d4b049b-… i begge), så kvitterings-
   tabellen og databasen er urørte.

   KÆDEN:
     gæsten vælger en officiel adresse i feltet
       → POST hertil med adressens ID (DAR-ID'et)
       → vi slår ID'et op hos Adressevælger
       → databasen afgør zonen (mosede_leveringszone)
       → kvittering skrives i leverings_valideringer
       → token retur til browseren
       → bestillingen bærer tokenet
       → udløseren kræver det og skriver SERVERENS adresse på

   ⚠️ KLIENTENS FELTER ER ALDRIG AUTORITATIVE. Funktionen her tager
      ét felt imod: adresse-ID'et. Alt andet — vej, husnummer,
      postnummer, by, koordinater — hentes hos tjenesten. Sender nogen
      "En falsk adresse i Aalborg" med, bliver den ikke læst.

   ⚠️ ZONEN AFGØRES AF DATABASEN, ikke her. Grænsen ligger som data
      i indstillingen leverings_zoner, og funktionen
      mosede_leveringszone er den eneste, der kender geometrien.
      Lå der en kopi her, ville de to skride fra hinanden, første
      gang ejeren flytter grænsen.

   ⚠️ FAIL CLOSED. Svarer adressetjenesten ikke, udstedes INGEN
      kvittering — og uden kvittering kan der ikke bestilles
      levering. Det er strengere end husets sædvanlige regel om, at
      en bestilling ikke må møde sten på vejen, og det er et
      bevidst valg: bedre at miste en levering i et kvarter end at
      køre mad til en adresse, ingen har kontrolleret.

   SÅDAN LÆGGES DEN OP (Supabase-dashboardet):
     1. Edge Functions → Deploy a new function → navn:
        valider-levering → sæt HELE denne fil ind
     2. "Verify JWT" skal være SLÅET FRA. Gæsten er ikke logget
        ind, og funktionen udleverer ingenting følsomt: den svarer
        kun med en adresse, kunden selv lige har valgt.
     3. Secrets: SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY ligger
        der automatisk. ADRESSEVAELGER_TOKEN sættes, når
        Klimadatastyrelsen har udstedt vores nøgle (support@kds.dk).
        Indtil da bruges TOKEN_STANDARD nedenfor.
     4. Databasen skal have kørt supabase/levering-zone.sql og
        supabase/levering-valideret.sql først.
   ============================================================ */

import { createClient } from "npm:@supabase/supabase-js@2";

/* Stemplet i loggen ved hver kold start — samme greb som
   send-push.ts, og af samme grund: en rettelse i repoet er ikke en
   rettelse i skyen, og der er ingen anden måde at SE forskel.
   ⚠️ Den skal følge med, når reglerne ændres. */
const UDGAVE = "2026-10-09 · Adressevælger i stedet for DAWA";
console.log("valider-levering · udgave " + UDGAVE);

/* Seks sekunder er rigeligt og betyder, at en hængende forbindelse
   ikke kan holde gæstens checkout fast. */
const OPSLAG_LOFT_MS = 6000;
const ADV_ADRESSE = "https://adressevaelger.dk/adresser/";

/* ⚠️ NØGLEN ER OBLIGATORISK — MEN DER ER ENDNU INGEN BRUGERSTYRING.
   Målt 9/10: uden token svarer tjenesten 400 "Mangler nødvendig
   queryparameter: token", og "abc" giver 400 "Ugyldigt token".
   Klimadatastyrelsen udsteder rigtige nøgler (support@kds.dk); indtil
   vores er her, bruger vi forretningens eget navn og IKKE den fælles
   demonøgle, som ikke må bruges i drift. Samme værdi som
   TOKEN_STANDARD i js/adressefelt.js. */
const TOKEN_STANDARD = "mosedehavnecafe.dk";
const ADV_TOKEN = Deno.env.get("ADRESSEVAELGER_TOKEN") || TOKEN_STANDARD;

/* Kvitteringen skal kunne nå at blive brugt, men ikke ligge og
   vente i en uge. To timer dækker en gæst, der bliver afbrudt
   midt i en bestilling. */
const KVITTERING_MINUTTER = 120;

/* Adressernes ID'er er UUID'er. Formatet kontrolleres FØR vi
   kalder udefra — ellers kan hvem som helst få os til at sende
   vilkårlige strenge videre til et fremmed API. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Svar = Record<string, unknown>;

/* Gæstesiden ligger på mosedehavnecafe.dk og kalder herfra.
   ⚠️ ÉT STED. Stod headerne to steder, kunne svaret og preflight
   komme til at sige hver sit om, hvem der må kalde. */
const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-max-age": "86400",
};

function json(krop: Svar, status = 200): Response {
  return new Response(JSON.stringify(krop), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

/* ------------------------------------------------------------
   ADRESSEVÆLGERS SVAR — FELTNAVNENE ER MÅLT, IKKE GÆTTET
   ------------------------------------------------------------
   Målt mod det levende API 9/10 2026 (GET /adresser/{id}?token=):

     status                                   "ok"
     adresse.id_lokalid                       "0a3f50ab-1317-…"
     adresse.adressebetegnelse                "Nylandsvej 43, 2690 Karlslunde"
     adresse.etagebetegnelse / doerbetegnelse null / null
     adresse.status                           "3"   (3 = gældende)
     adresse.husnummer.vejnavn                "Nylandsvej"
     adresse.husnummer.husnummertekst         "43"
     adresse.husnummer.postnummer.postnr/navn "2690" / "Karlslunde"
     adresse.husnummer.adgangspunkt.koordinater { x: 703037.01,
                                                  y: 6163139.61 }

   ⚠️ STATUS ER EN TEKST, OG "GÆLDENDE" ER 3 — IKKE 1 SOM I DAWA.
      Stod det gamle tjek her, ville hver eneste adresse blive afvist.
   ⚠️ KOORDINATERNE ER UTM 32N (EPSG:25832) I METER, IKKE LÆNGDE/BREDDE.
      Zonen i databasen er tegnet i længde/bredde, så de omregnes
      nedenfor. Sendt urørt ville Mosede ligge 700 km ude i ingenting.
   ⚠️ UKENDTE FELTER IGNORERES. Tjenesten får nye felter over tid, og
      koden må ikke fejle, fordi der kommer et mere.
   ------------------------------------------------------------ */
function tekst(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/* ⟪ UTM ⟫ ETRS89 / UTM zone 32N → længde/bredde (GRS80), Krügers
   rækker. ⚠️ MÅLT MOD DET GAMLE SVAR: Havnevej 20, 2670 Greve giver
   12.28463387 / 55.56647759 — DAWA sagde 12.28463387 / 55.5664776.
   Under en centimeter fra hinanden. Prøven i tests/adressevaelger.spec.js
   kører netop den her blok. */
function utmTilLaengdeBredde(x: number, y: number): [number, number] {
  const a = 6378137.0, f = 1 / 298.257222101, k0 = 0.9996;
  const n = f / (2 - f);
  const A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64);
  const b1 = n / 2 - 2 * n * n / 3 + 37 * n ** 3 / 96;
  const b2 = n * n / 48 + n ** 3 / 15;
  const b3 = 17 * n ** 3 / 480;
  const d1 = 2 * n - 2 * n * n / 3 - 2 * n ** 3;
  const d2 = 7 * n * n / 3 - 8 * n ** 3 / 5;
  const d3 = 56 * n ** 3 / 15;
  const xi = y / (k0 * A);
  const eta = (x - 500000) / (k0 * A);
  const xp = xi - (b1 * Math.sin(2 * xi) * Math.cosh(2 * eta)
    + b2 * Math.sin(4 * xi) * Math.cosh(4 * eta)
    + b3 * Math.sin(6 * xi) * Math.cosh(6 * eta));
  const ep = eta - (b1 * Math.cos(2 * xi) * Math.sinh(2 * eta)
    + b2 * Math.cos(4 * xi) * Math.sinh(4 * eta)
    + b3 * Math.cos(6 * xi) * Math.sinh(6 * eta));
  const chi = Math.asin(Math.sin(xp) / Math.cosh(ep));
  const bredde = chi + d1 * Math.sin(2 * chi) + d2 * Math.sin(4 * chi)
    + d3 * Math.sin(6 * chi);
  const laengde = (9 * Math.PI / 180) + Math.atan2(Math.sinh(ep), Math.cos(xp));
  return [laengde * 180 / Math.PI, bredde * 180 / Math.PI];
}

function normaliser(rå: unknown) {
  if (!rå || typeof rå !== "object") return null;
  const svar = rå as Record<string, unknown>;
  if (svar.status !== undefined && svar.status !== "ok") return null;
  const d = (svar.adresse ?? {}) as Record<string, unknown>;
  const hn = (d.husnummer ?? {}) as Record<string, unknown>;
  const post = (hn.postnummer ?? {}) as Record<string, unknown>;
  const punkt = (hn.adgangspunkt ?? {}) as Record<string, unknown>;
  const k = (punkt.koordinater ?? {}) as Record<string, unknown>;
  const vej = (hn.navngivenvej ?? {}) as Record<string, unknown>;

  const id = tekst(d.id_lokalid);
  const adresse = tekst(d.adressebetegnelse);
  const postnr = tekst(post.postnr);
  if (!id || !adresse || !postnr) return null;

  /* "3" er gældende. En nedlagt eller henlagt adresse må ikke kunne
     bestilles til — der står ikke noget hus mere. */
  if (String(d.status ?? "") !== "3") return null;

  const x = k.x, y = k.y;
  if (typeof x !== "number" || !isFinite(x)) return null;
  if (typeof y !== "number" || !isFinite(y)) return null;
  /* Danmark i UTM 32N. Et punkt udenfor er en fejl i svaret, ikke en
     adresse, vi skal regne en zone for. */
  if (x < 400000 || x > 950000 || y < 6000000 || y > 6450000) return null;
  const [lng, lat] = utmTilLaengdeBredde(x, y);

  return {
    dawaId: id,
    adresse,
    vejnavn: tekst(hn.vejnavn) ?? tekst(vej.vejnavn),
    husnr: tekst(hn.husnummertekst),
    etage: tekst(d.etagebetegnelse),
    doer: tekst(d.doerbetegnelse),
    postnr,
    by: tekst(post.navn),
    lng,
    lat,
  };
}
/* ⟪ /UTM ⟫ */

async function hentAdresse(id: string) {
  const ur = new AbortController();
  const timer = setTimeout(() => ur.abort(), OPSLAG_LOFT_MS);
  try {
    const r = await fetch(ADV_ADRESSE + encodeURIComponent(id)
      + "?token=" + encodeURIComponent(ADV_TOKEN), {
      signal: ur.signal,
      headers: {
        accept: "application/json",
        /* ⚠️ "identity" ER IKKE PYNT — UDEN DEN VIRKER INGENTING.
           Målt i produktionen 21/9: Deno henter som standard med
           accept-encoding gzip/br, og DAWA's pakkede svar kan
           kørselsmiljøet her IKKE folde ud. `await r.json()` døde
           med "TypeError: unexpected end of file" på hver eneste
           gyldig adresse — mens et ID, der ikke findes, kom
           igennem, fordi 404 tjekkes på status FØR kroppen læses.
           Det fik fejlen til at ligne "Dataforsyningen er nede",
           og siden svarede fail closed: ingen kunne bestille
           levering. Beder vi om svaret upakket, kommer alle 4.704
           bytes igennem på 35 ms. Fjern ikke linjen. */
        "accept-encoding": "identity",
      },
    });
    if (r.status === 404) return { slags: "ikke_fundet" as const };
    if (!r.ok) {
      /* ⚠️ EN AFVIST NØGLE SKAL KUNNE SES I LOGGEN. Når Klimadata-
         styrelsen slår brugerstyring til, svarer tjenesten 400/401/403
         på vores standardnøgle — og for gæsten ligner det, at tjenesten
         er nede. Loggen skal sige, hvad det er. Ingen gæstedata i den. */
      const tekstSvar = await r.text().catch(() => "");
      console.error("valider-levering: Adressevælger svarede " + r.status
        + " — " + tekstSvar.slice(0, 120));
      return { slags: "nede" as const };
    }
    return { slags: "ok" as const, krop: await r.json() };
  } catch (fejl) {
    /* ⚠️ FEJLEN SKAL MED I LOGGEN. Første udgave skrev kun
       "Dataforsyningen svarede ikke" og smed beskeden væk — og så
       lignede en pakke-fejl i VORES ende et nedbrud i DERES. Det
       kostede en time 21/9. Beskeden er teknisk og indeholder ikke
       gæstens data; adressen står ikke i den. */
    console.error("valider-levering: opslaget fejlede — " + String(fejl));
    return { slags: "nede" as const };
  } finally {
    clearTimeout(timer);
  }
}

function nytToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}

Deno.serve(async (req) => {
  /* ⚠️⚠️ ET 204-SVAR MÅ IKKE HAVE EN KROP — OG DET VÆLTEDE HELE
     LEVERINGEN  (målt 21/9).

     Her stod `return json({}, 204)`. json() lægger altid en krop
     på, og `new Response("{}", { status: 204 })` KASTER i
     kørselsmiljøet: et 204 er defineret som "intet indhold".
     Funktionen svarede derfor **500 uden CORS-headere** på
     browserens preflight — og så blokerer browseren POST'en, før
     den sendes.

     ⚠️ DET SÅ UD SOM NOGET ANDET. Gæsten fik "Vi kunne ikke
     kontrollere leveringsadressen lige nu", altså husets
     fail-closed-besked, som om Dataforsyningen var nede. Og curl
     sender ingen preflight, så hver eneste måling med curl
     bestod. Fejlen kunne KUN ses ved at køre en rigtig browser
     mod det levende site.

     Svaret er tomt med vilje: `new Response(null, …)`. */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") return json({ fejl: "kun POST" }, 405);

  const krop = await req.json().catch(() => null);
  /* adresseId fra 9/10; dawaId fra den gamle side, som en browser kan
     have liggende i en fane. Det er det samme ID. */
  const id = tekst((krop as Record<string, unknown> | null)?.adresseId)
    ?? tekst((krop as Record<string, unknown> | null)?.dawaId);
  const lokation = tekst((krop as Record<string, unknown> | null)?.lokation)
    ?? "mosede";

  /* ⚠️ FORMATET KONTROLLERES FØR VI RINGER UD. Uden det kunne hvem
     som helst bruge funktionen til at sende vilkårlige strenge
     videre til et fremmed API. */
  if (!id || !UUID.test(id)) {
    return json({ gyldig: false, grund: "UGYLDIGT_ID" }, 400);
  }

  const svar = await hentAdresse(id);
  if (svar.slags === "ikke_fundet") {
    return json({ gyldig: false, grund: "ADRESSE_IKKE_FUNDET" }, 200);
  }
  if (svar.slags === "nede") {
    /* ⚠️ FAIL CLOSED: ingen kvittering, altså ingen levering. */
    return json({ gyldig: false, grund: "ADRESSETJENESTE_NEDE" }, 503);
  }

  const a = normaliser(svar.krop);
  if (!a) {
    return json({ gyldig: false, grund: "UGYLDIG_ADRESSE" }, 200);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /* ⚠️ ZONEN AFGØRES AF DATABASEN. Geometrien og grænsen bor ét
     sted (supabase/levering-zone.sql); en kopi her ville skride
     fra hinanden, første gang ejeren flytter grænsen. */
  const { data: zone, error: zoneFejl } = await db.rpc("mosede_leveringszone", {
    p_lng: a.lng,
    p_lat: a.lat,
    p_lokation: lokation,
  });

  if (zoneFejl) {
    console.error("valider-levering: zonen kunne ikke slås op");
    return json({ gyldig: false, grund: "ADRESSETJENESTE_NEDE" }, 503);
  }

  const svarZone = typeof zone === "string" ? zone : "nej";

  /* Uden for området: vi udsteder INGEN kvittering, men fortæller
     gæsten hvorfor — og med den officielle adresse, så hun kan se,
     at vi forstod hende rigtigt. */
  if (svarZone !== "ja") {
    return json({
      gyldig: true,
      leveres: false,
      grund: svarZone === "spoerg" ? "RING_TIL_OS" : "UDEN_FOR_OMRAADET",
      adresse: a.adresse,
    });
  }

  const token = nytToken();
  const udloeber = new Date(Date.now() + KVITTERING_MINUTTER * 60_000)
    .toISOString();

  const { error: skrivFejl } = await db
    .from("leverings_valideringer")
    .insert({
      token,
      lokation_id: lokation,
      dawa_id: a.dawaId,
      adresse: a.adresse,
      vejnavn: a.vejnavn,
      husnr: a.husnr,
      etage: a.etage,
      doer: a.doer,
      postnr: a.postnr,
      by: a.by,
      lng: a.lng,
      lat: a.lat,
      zone: svarZone,
      udloeber,
    });

  if (skrivFejl) {
    console.error("valider-levering: kvitteringen kunne ikke skrives");
    return json({ gyldig: false, grund: "ADRESSETJENESTE_NEDE" }, 503);
  }

  /* Ryd op efter os: kvitteringer, der er mere end et døgn over
     udløb, har ingen værdi og skal ikke ligge og vokse. Fejler
     oprydningen, er det ligegyldigt for gæsten — derfor uden
     await-afhængighed på svaret. */
  db.from("leverings_valideringer")
    .delete()
    .lt("udloeber", new Date(Date.now() - 86_400_000).toISOString())
    .then(() => {}, () => {});

  /* ⚠️ DELENE SENDES MED TILBAGE  (21/9). Ejerens oenske: gaesten
     skal SE adressen delt op — vej, nummer, postnummer — saa hun
     kan se, hvad vi forstod, foer hun binder sig.

     ⚠️ OG DE KOMMER FRA SERVEREN, IKKE FRA BROWSEREN. Felterne
     laa allerede her: de skrives i kvitteringen (leverings_
     valideringer). Lod vi browseren dele forslagets tekst op
     selv, ville den vise noget, ingen havde bekraeftet — og hele
     pointen med opslaget er, at klientens felter aldrig er
     autoritative. */
  return json({
    gyldig: true,
    leveres: true,
    token,
    adresse: a.adresse,
    vejnavn: a.vejnavn,
    husnr: a.husnr,
    etage: a.etage,
    doer: a.doer,
    postnr: a.postnr,
    by: a.by,
  });
});
