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

   Nu slår SERVEREN adressen op hos Dataforsyningen og udsteder en
   kvittering. Gæsten sender kvitteringens token med bestillingen,
   og udløseren i databasen (supabase/levering-valideret.sql)
   overskriver adressen med den, DAWA bekræftede.

   KÆDEN:
     gæsten vælger en officiel adresse i feltet
       → POST hertil med DAWA's adresse-ID
       → vi slår ID'et op hos Dataforsyningen
       → databasen afgør zonen (mosede_leveringszone)
       → kvittering skrives i leverings_valideringer
       → token retur til browseren
       → bestillingen bærer tokenet
       → udløseren kræver det og skriver SERVERENS adresse på

   ⚠️ KLIENTENS FELTER ER ALDRIG AUTORITATIVE. Funktionen her tager
      ét felt imod: adresse-ID'et. Alt andet — vej, husnummer,
      postnummer, by, koordinater — hentes hos DAWA. Sender nogen
      "En falsk adresse i Aalborg" med, bliver den ikke læst.

   ⚠️ ZONEN AFGØRES AF DATABASEN, ikke her. Grænsen ligger som data
      i indstillingen leverings_zoner, og funktionen
      mosede_leveringszone er den eneste, der kender geometrien.
      Lå der en kopi her, ville de to skride fra hinanden, første
      gang ejeren flytter grænsen.

   ⚠️ FAIL CLOSED. Svarer Dataforsyningen ikke, udstedes INGEN
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
     3. Secrets: ingen nye. SUPABASE_URL og
        SUPABASE_SERVICE_ROLE_KEY ligger der automatisk.
     4. Databasen skal have kørt supabase/levering-zone.sql og
        supabase/levering-valideret.sql først.
   ============================================================ */

import { createClient } from "npm:@supabase/supabase-js@2";

/* Stemplet i loggen ved hver kold start — samme greb som
   send-push.ts, og af samme grund: en rettelse i repoet er ikke en
   rettelse i skyen, og der er ingen anden måde at SE forskel.
   ⚠️ Den skal følge med, når reglerne ændres. */
const UDGAVE = "2026-09-21 · upakket svar fra DAWA";
console.log("valider-levering · udgave " + UDGAVE);

/* Dataforsyningen svarer normalt på under 100 ms (målt 20/9: 94 ms).
   Seks sekunder er rigeligt og betyder, at en hængende forbindelse
   ikke kan holde gæstens checkout fast. */
const DAWA_LOFT_MS = 6000;
const DAWA_ADRESSE = "https://api.dataforsyningen.dk/adresser/";

/* Kvitteringen skal kunne nå at blive brugt, men ikke ligge og
   vente i en uge. To timer dækker en gæst, der bliver afbrudt
   midt i en bestilling. */
const KVITTERING_MINUTTER = 120;

/* DAWA's egne ID'er er UUID'er. Formatet kontrolleres FØR vi
   kalder udefra — ellers kan hvem som helst få os til at sende
   vilkårlige strenge videre til et fremmed API. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Svar = Record<string, unknown>;

function json(krop: Svar, status = 200): Response {
  return new Response(JSON.stringify(krop), {
    status,
    headers: {
      "content-type": "application/json",
      /* Gæstesiden ligger på mosedehavnecafe.dk og kalder herfra. */
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST, OPTIONS",
    },
  });
}

/* ------------------------------------------------------------
   DAWA'S SVAR — FELTNAVNENE ER MÅLT, IKKE GÆTTET
   ------------------------------------------------------------
   Målt mod det levende API 20/9 2026 på Havnevej 20:

     id                                     "5d4b049b-…"
     status                                 1        (1 = gældende)
     adressebetegnelse                      "Havnevej 20, 2670 Greve"
     etage / dør                            null / null
     adgangsadresse.husnr                   "20"
     adgangsadresse.vejstykke.navn          "Havnevej"
     adgangsadresse.postnummer.nr / .navn   "2670" / "Greve"
     adgangsadresse.adgangspunkt.koordinater  [12.28463387, 55.5664776]

   ⚠️ FELTET HEDDER "dør" — MED Ø I SELVE NØGLEN. En parser, der
      antager ASCII, taber etage og dør uden at sige noget.

   ⚠️ KOORDINATERNE ER [længde, bredde] — lng, lat. Byttes de om,
      bliver Mosede til et punkt ud for Afrikas horn.

   ⚠️ UKENDTE FELTER IGNORERES. DAWA får nye felter over tid, og
      koden må ikke fejle, fordi der kommer et mere.
   ------------------------------------------------------------ */
function tekst(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function normaliser(rå: unknown) {
  if (!rå || typeof rå !== "object") return null;
  const d = rå as Record<string, unknown>;

  const adg = (d.adgangsadresse ?? {}) as Record<string, unknown>;
  const vej = (adg.vejstykke ?? {}) as Record<string, unknown>;
  const post = (adg.postnummer ?? {}) as Record<string, unknown>;
  const punkt = (adg.adgangspunkt ?? {}) as Record<string, unknown>;
  const koord = punkt.koordinater;

  const id = tekst(d.id);
  const adresse = tekst(d.adressebetegnelse);
  const postnr = tekst(post.nr);

  if (!id || !adresse || !postnr) return null;
  if (!Array.isArray(koord) || koord.length !== 2) return null;

  const lng = koord[0];
  const lat = koord[1];
  if (typeof lng !== "number" || !isFinite(lng)) return null;
  if (typeof lat !== "number" || !isFinite(lat)) return null;

  /* status 1 er "gældende". En nedlagt adresse må ikke kunne
     bestilles til — der står ikke noget hus mere. */
  if (typeof d.status === "number" && d.status !== 1) return null;

  return {
    dawaId: id,
    adresse,
    vejnavn: tekst(vej.navn),
    husnr: tekst(adg.husnr),
    etage: tekst(d.etage),
    doer: tekst(d["dør"]),
    postnr,
    by: tekst(post.navn),
    lng,
    lat,
  };
}

async function hentHosDawa(id: string) {
  const ur = new AbortController();
  const timer = setTimeout(() => ur.abort(), DAWA_LOFT_MS);
  try {
    const r = await fetch(DAWA_ADRESSE + encodeURIComponent(id), {
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
    if (!r.ok) return { slags: "nede" as const };
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
  if (req.method === "OPTIONS") return json({}, 204);
  if (req.method !== "POST") return json({ fejl: "kun POST" }, 405);

  const krop = await req.json().catch(() => null);
  const id = tekst((krop as Record<string, unknown> | null)?.dawaId);
  const lokation = tekst((krop as Record<string, unknown> | null)?.lokation)
    ?? "mosede";

  /* ⚠️ FORMATET KONTROLLERES FØR VI RINGER UD. Uden det kunne hvem
     som helst bruge funktionen til at sende vilkårlige strenge
     videre til et fremmed API. */
  if (!id || !UUID.test(id)) {
    return json({ gyldig: false, grund: "UGYLDIGT_ID" }, 400);
  }

  const svar = await hentHosDawa(id);
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

  return json({
    gyldig: true,
    leveres: true,
    token,
    adresse: a.adresse,
    postnr: a.postnr,
    by: a.by,
  });
});
