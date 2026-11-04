/* ============================================================
   ⚠️⚠️  DEN HER FIL ER **IKKE** SQL  ⚠️⚠️
   ------------------------------------------------------------
   Den skal ind under **Edge Functions**, ikke SQL Editor — se
   "SÅDAN LÆGGES DEN OP" nedenfor.
   ============================================================

   EDGE FUNCTION: laes-opgaver — "HJERNEN"   (4. nov 2026)
   ------------------------------------------------------------
   Mikkel 4/11: *"det skal være en hjerne, der læser dokumentet, og
   hvad Jim sådan vil med hans dokument og formålet med det, og
   laver lister ud fra det"* — også når dokumentet er sat helt
   anderledes op end det, læseren i js/admin/opgave-laeser.js kender.

   Cheferne vælger en fil i admin (Opgaver → Læg en ny liste ind).
   Browseren sender den hertil; vi beder Claude (Anthropic) læse den
   og svare med færdige lister i et fast format. Cheferne ser
   udkastet og retter, FØR noget gemmes — hjernen gemmer aldrig selv.

     PDF        → sendes som PDF (Claude ser siderne, også tabeller)
     Billede    → et foto af en papirliste (browseren gør det mindre)
     Word/Excel → teksten, som browseren allerede har trukket ud

   ⚠️ KUN CHEFERNE. Verify JWT er slået TIL, og funktionen spørger
      databasen (er_ejer_for), om den, der kalder, er chef i Mosede.
      Ellers kunne hvem som helst bruge husets nøgle.

   ⚠️ SLUKKET = INGEN SKADE. Er ANTHROPIC_API_KEY ikke sat, svarer
      funktionen 503 "hjerne_slukket", og admin bruger den gamle
      læser i browseren. Intet går i stykker.

   PRIS: typisk 50 øre til 1 kr. pr. dokument (Claude Opus 5.5). Prisen kan
   følges på console.anthropic.com → Usage. Sæt gerne en grænse der.

   SÅDAN LÆGGES DEN OP (Supabase-dashboardet, epwyjzakvvbxtpvnhvbn):
     1. Opret en nøgle på console.anthropic.com → API Keys (husets
        egen konto og kort). Kopiér den (starter med sk-ant-).
     2. Edge Functions → Secrets → Add new secret:
        navn ANTHROPIC_API_KEY, værdi = nøglen.
     3. Edge Functions → Deploy a new function → Via Editor →
        navn: laes-opgaver → slet eksemplet, sæt HELE denne fil
        ind → Deploy.
     4. "Verify JWT" skal være SLÅET TIL (standard). Rør det ikke.
   ============================================================ */

import Anthropic from "npm:@anthropic-ai/sdk@1.1.0";

const UDGAVE = "2026-11-04 · første hjerne";
console.log("laes-opgaver · udgave " + UDGAVE);

const MODEL = "claude-opus-5-5";
// Grænser: et billede/en PDF over 12 MB eller en tekst over 200.000
// tegn er ikke en opgaveliste — og koster unødigt.
const MAX_B64 = 16_000_000;
const MAX_TEKST = 200_000;
const LOKATION = "mosede";

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-max-age": "86400",
};
function json(krop: unknown, status = 200): Response {
  return new Response(JSON.stringify(krop), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

/* ------------------------------------------------------------
   SVARETS FORM — Claude SKAL svare præcis sådan (structured output).
   Samme felter som udkastet i admin (js/admin/opgaver.js).
   ------------------------------------------------------------ */
// "Må være tom" skrives som anyOf med null — den form, structured outputs understøtter.
function ellerNull(skema: Record<string, unknown>, description: string) {
  return { anyOf: [skema, { type: "null" }], description };
}
const DAG = ellerNull({ type: "integer" }, "1 = mandag … 7 = søndag, eller null");
const DATO = ellerNull({ type: "string", format: "date" }, "ÅÅÅÅ-MM-DD, eller null");
const SKEMA = {
  type: "object",
  additionalProperties: false,
  required: ["forklaring", "lister"],
  properties: {
    forklaring: {
      type: "string",
      description: "1–3 korte sætninger på dansk til chefen: hvad dokumentet går ud på, og hvordan du har lavet det om til lister (periode, dage).",
    },
    lister: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titel", "ugedage", "gyldig_fra", "gyldig_til", "periode_tekst", "ansvarlig_initialer", "afsnit"],
        properties: {
          titel: { type: "string" },
          ugedage: ellerNull({ type: "array", items: { type: "integer" } },
            "Kun hvis HELE listen kun gælder bestemte ugedage (fx weekendliste = [6,7]). Ellers null."),
          gyldig_fra: DATO,
          gyldig_til: DATO,
          periode_tekst: ellerNull({ type: "string" }, "Ordene i dokumentet, perioden kom fra, fx 'gælder uge 46-47'."),
          ansvarlig_initialer: ellerNull({ type: "string" },
            "Kun hvis dokumentet siger, hvem der står for listen, og personen er på holdet."),
          afsnit: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["navn", "ugedag", "dato", "opgaver"],
              properties: {
                navn: { type: "string", description: "Overskriften, eller tom streng." },
                ugedag: DAG,
                dato: DATO,
                opgaver: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["tekst", "vaerdi", "ugedag", "dato"],
                    properties: {
                      tekst: { type: "string" },
                      vaerdi: ellerNull({ type: "string" },
                        "Hvis der skal skrives et tal/en værdi ved opgaven: en kort etiket som 'Temp. °C', 'Antal', 'Kr.'. Ellers null."),
                      ugedag: DAG,
                      dato: DATO,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

function systemTekst(idag: string, ugedagNavn: string, hold: { navn: string; initialer: string }[]): string {
  return `Du hjælper Mosede Havnecafe (en café ved havnen i Greve) med at gøre personalets egne dokumenter til
daglige tjeklister på en iPad. Personalet sætter deres initialer ved hver opgave, når den er gjort; cheferne
ser dit forslag og retter det, før det gemmes.

Læs dokumentet som en erfaren kollega: Forstå, hvad forfatteren VIL — hvad der skal gøres, hvornår og af hvem —
også når dokumentet er rodet, håndskrevet, sat op som tabel, skema, mail, punktliste eller fri tekst.

Sådan:
- En opgave er noget, en medarbejder gør og kan krydse af. Skriv den kort og tydeligt på dansk i bydeform, tæt på
  forfatterens egne ord (ret kun åbenlyse stavefejl). Find aldrig på opgaver, der ikke står der.
- Spring over: papirets egne felter (Dato, Uge: ___, Sign., Initialer, Kontrolleret af, sidetal), hilsner,
  telefonnumre, overskrifter uden indhold og forklaringer, der ikke er noget, man gør.
- Skal der noteres et tal (temperatur, antal, beløb), så sæt vaerdi til en kort etiket ("Temp. °C", "Antal", "Kr.").
  "Temp køleskab: ____ fryser: ____" er TO opgaver, hver med vaerdi "Temp. °C".
- Afsnit: brug dokumentets overskrifter eller naturlige grupper (Åbning, Lukning, Dagligt …). Ét afsnit uden navn er fint.
- Dage: står en opgave kun på bestemte dage ("Mandag:", "hver fredag", "Fredag 13/11"), så sæt ugedag (1 = mandag
  … 7 = søndag) eller dato. Gælder et helt afsnit kun én dag, sæt det på afsnittet OG på dets opgaver. null = hver dag.
- Periode: gælder dokumentet kun en tid ("uge 46-47", "de næste 5 dage", "10/11-23/11", "næste uge"), så sæt
  gyldig_fra/gyldig_til som datoer. I dag er ${ugedagNavn} ${idag}; ugenumre er danske (ISO). Uden årstal: det
  nærmeste kommende. Gælder den altid, så null.
- Én liste er det normale. Lav kun flere lister, hvis dokumentet tydeligt rummer adskilte rutiner til forskellige
  tidspunkter eller formål, som giver mening hver for sig (fx en daglig lukkeliste OG en ugentlig rengøringsplan).
- Ansvarlig: kun hvis dokumentet nævner, hvem der står for listen, og personen er på holdet.${hold.length
    ? "\n  Holdet: " + hold.map((m) => `${m.navn} (${m.initialer})`).join(", ") + "."
    : ""}
- Er dokumentet ikke en opgaveliste, så svar med en tom liste og forklar kort hvorfor.
- forklaring: skriv til chefen i et par venlige, korte sætninger, hvad du har forstået.`;
}

const UGEDAGE = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];

async function erChef(req: Request): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const auth = req.headers.get("authorization") || "";
  if (!url || !anon || !/^Bearer\s+\S+/.test(auth)) return false;
  const r = await fetch(url + "/rest/v1/rpc/er_ejer_for", {
    method: "POST",
    headers: { apikey: anon, authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ lok: LOKATION }),
  });
  if (!r.ok) return false;
  return (await r.json()) === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ fejl: "kun_post" }, 405);

  const noegle = Deno.env.get("ANTHROPIC_API_KEY");
  if (!noegle) return json({ fejl: "hjerne_slukket" }, 503);

  try {
    if (!(await erChef(req))) return json({ fejl: "kun_cheferne" }, 403);
  } catch (_e) {
    return json({ fejl: "kun_cheferne" }, 403);
  }

  let ind: Record<string, unknown>;
  try {
    ind = await req.json();
  } catch (_e) {
    return json({ fejl: "ugyldig_forespoergsel" }, 400);
  }
  const navn = String(ind.navn || "dokument").slice(0, 200);
  const mime = String(ind.mime || "");
  const data = typeof ind.data === "string" ? ind.data : "";
  const tekst = typeof ind.tekst === "string" ? ind.tekst : "";
  const idag = /^\d{4}-\d{2}-\d{2}$/.test(String(ind.idag)) ? String(ind.idag) : new Date().toISOString().slice(0, 10);
  const hold = (Array.isArray(ind.hold) ? ind.hold : []).slice(0, 60).map((m: Record<string, unknown>) => ({
    navn: String(m?.navn || "").slice(0, 80),
    initialer: String(m?.initialer || "").slice(0, 4),
  })).filter((m) => m.navn && m.initialer);

  if (data.length > MAX_B64 || tekst.length > MAX_TEKST) return json({ fejl: "for_stor" }, 413);

  // Dokumentet som indhold til Claude.
  const indhold: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (data && mime === "application/pdf") {
    indhold.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
  } else if (data && /^image\/(jpeg|png|gif|webp)$/.test(mime)) {
    indhold.push({
      type: "image",
      source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data },
    });
  } else if (tekst.trim()) {
    indhold.push({ type: "text", text: `<dokument navn="${navn.replace(/"/g, "'")}">\n${tekst}\n</dokument>` });
  } else {
    return json({ fejl: "intet_dokument" }, 400);
  }
  indhold.push({
    type: "text",
    text: `Filen hedder "${navn}". Lav den om til opgavelister efter reglerne.`,
  });

  const ugedagNavn = UGEDAGE[new Date(idag + "T12:00:00Z").getUTCDay()];
  const client = new Anthropic({ apiKey: noegle, timeout: 140_000, maxRetries: 1 });

  try {
    const svar = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Afvises en forespørgsel af sikkerhedsfiltrene, prøver API'et
      // selv en anden model i samme kald.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SKEMA } },
      system: systemTekst(idag, ugedagNavn, hold),
      messages: [{ role: "user", content: indhold }],
    });

    if (svar.stop_reason === "refusal") return json({ fejl: "afvist" }, 422);
    if (svar.stop_reason === "max_tokens") return json({ fejl: "for_lang" }, 422);
    const blok = svar.content.find((b) => b.type === "text");
    if (!blok || blok.type !== "text") return json({ fejl: "intet_svar" }, 502);
    let resultat: unknown;
    try {
      resultat = JSON.parse(blok.text);
    } catch (_e) {
      return json({ fejl: "intet_svar" }, 502);
    }
    console.log("laes-opgaver ok", navn, svar.usage?.input_tokens, svar.usage?.output_tokens);
    return json({ ok: true, model: svar.model, resultat });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ fejl: "noegle_forkert" }, 502);
    if (e instanceof Anthropic.RateLimitError) return json({ fejl: "optaget" }, 503);
    if (e instanceof Anthropic.BadRequestError) {
      console.error("laes-opgaver 400", e.message);
      return json({ fejl: "kunne_ikke_laese" }, 422);
    }
    if (e instanceof Anthropic.APIError) {
      console.error("laes-opgaver api", e.status, e.message);
      return json({ fejl: "hjerne_fejl" }, 502);
    }
    console.error("laes-opgaver", e);
    return json({ fejl: "hjerne_fejl" }, 502);
  }
});
