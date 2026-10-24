/* ============================================================
   ⚠️⚠️  DEN HER FIL ER **IKKE** SQL  ⚠️⚠️
   ------------------------------------------------------------
   Den skal ind under **Edge Functions**, ikke i SQL Editor —
   opskriften står i docs/SMS-OPSAETNING.md.
   ============================================================

   EDGE FUNCTION: send-sms  (24/10)
   ------------------------------------------------------------
   Gæsten får to sms'er fra Mosede Havnecafe, når hun bestiller
   AFHENTNING eller SPIS HER på siden:
     1) med det samme: nummeret, hvornår, og et link til
        min-bestilling/, hvor bestillingen kan følges
     2) ca. 30 min. før: "om ca. 30 min er din mad klar ved lugen —
        sig nummer M-0047"

   ⚠️ IKKE ved bordet (QR), og IKKE levering. Ejeren 15/9 om "Din
   mad er klar": *"for dyrt i længden — de må selv gå ned"*. Mikkels
   valg 24/10: kun afhentning og spis her, bygget slukket.

   Kæden (supabase/sms.sql):
     gæst sender → rækken lander → udløseren sms_ny_bestilling
       → POST hertil {"slags":"bekraeft","id":…}
     pg_cron hvert 5. minut → POST hertil {"slags":"paamind"}

   Secrets (Edge Functions → Secrets — gælder hele projektet):
     PUSH_SECRET       findes i forvejen (send-push). Døren her er
                       den samme header, x-mosede-secret
     GATEWAYAPI_TOKEN  fra gatewayapi.com → API → API Keys
     SMS_AKTIV         "ja" for at sende. ALT ANDET = der sendes
                       intet; loggen skriver, hvad der VILLE være
                       sendt. Det er sådan, den står fra start
     SMS_KUN_TIL       valgfri: ét nummer. Så går sms'er KUN dertil
                       (til at prøve det af på egen telefon)
     SMS_AFSENDER      valgfri, standard "MosedeHavn" (højst 11 tegn)
   "Verify JWT" skal være SLÅET FRA, som på send-push.

   ⚠️ EN SMS MÅ ALDRIG STÅ I VEJEN FOR EN BESTILLING: den er gemt,
   før vi bliver kaldt. Og hver sms "gøres der krav på" i
   sms_sendt, FØR den sendes — så den samme gæst aldrig får den
   samme besked to gange, heller ikke hvis to kald krydser.
   ============================================================ */

import { createClient } from "npm:@supabase/supabase-js@2";

// ---------- tekster (rene funktioner — prøvet uden net) ----------

const LOKATION = "mosede";
const TELEFON = "28 87 13 43";
const ADRESSE = "Havnevej 20I, Greve";
const STATUSSIDE = "mosedehavnecafe.dk/min-bestilling/?ref=";
/* Åbne statusser — de samme tre som admin (AABNE i
   js/admin/bestillinger.js). Afvist, afhentet, udeblevet: ingen
   påmindelse. Et nyt ord får heller ingen, før nogen tager stilling. */
const AABNE = ["ny", "bekraeftet", "klar"];

type Bestilling = {
  id: number; reference: string; lokation_id: string; navn: string;
  telefon: string | null; hent_dato: string; hent_tid: string;
  hvordan: string; bord_nummer: string | null; kanal: string | null;
  status: string; slettet: string | null; oprettet: string;
  nummer: number | null;
};

/* Samme regel som udløseren i sms.sql. Tjekkes igen her, fordi en
   række kan være rettet, mellem den blev lagt og vi læser den. */
function faarSms(b: Bestilling): boolean {
  return b.lokation_id === LOKATION
    && (b.hvordan === "afhentning" || b.hvordan === "spis_her")
    && !b.bord_nummer && b.kanal !== "bord"
    && !!String(b.telefon || "").trim()
    && !b.slettet && AABNE.includes(b.status);
}

/* dansk nummer → 45xxxxxxxx; med landekode går det igennem */
function msisdn(tlf: string | null): string | null {
  let n = String(tlf || "").replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("00")) n = n.slice(2);
  if (/^\d{8}$/.test(n)) n = "45" + n;
  return /^\d{10,15}$/.test(n) ? n : null;
}

/* Klokken i Danmark. Funktionen kører på UTC — "i dag" må ikke
   skifte ved 22-tiden (samme fælde som send-push). */
function lokal(d: Date) {
  const del = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((p) => [p.type, p.value]));
  return { iso: `${del.year}-${del.month}-${del.day}`, min: Number(del.hour) * 60 + Number(del.minute) };
}
const tilMin = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
/* "12.30" — sådan skriver siden klokken */
const kl = (t: string) => String(t || "").slice(0, 5).replace(":", ".");
const UGEDAGE = ["søn", "man", "tirs", "ons", "tors", "fre", "lør"];
function dag(iso: string, nu: Date) {
  const idag = lokal(nu).iso;
  if (iso === idag) return "i dag";
  if (iso === lokal(new Date(nu.getTime() + 864e5)).iso) return "i morgen";
  const [, m, d] = iso.split("-").map(Number);
  return `${UGEDAGE[new Date(iso + "T12:00:00Z").getUTCDay()]}. ${d}/${m}`;
}
const fornavn = (n: string) => String(n || "").trim().split(/\s+/)[0].slice(0, 14);
/* M-0047 — som pæntNummer i js/store.js. Uden nummer: referencen. */
const nr = (b: Bestilling) =>
  b.nummer && b.nummer > 0 ? "M-" + String(b.nummer).padStart(4, "0") : b.reference;
const tapas = (b: Bestilling) => b.kanal === "tapas";

/* Påmindelsen kommer kun, når der er mindst en time til — så lover
   bekræftelsen den kun dér. */
function faarPaamind(b: Bestilling, nu: Date) {
  const n = lokal(nu);
  const t = tilMin(b.hent_tid);
  return b.hent_dato > n.iso || (b.hent_dato === n.iso && t !== null && t - n.min >= 60);
}

/* ÉN sms (højst 160 tegn) — ellers koster den det dobbelte. Den
   første udgave, der kan være der, vinder; linket til statussiden
   er det sidste, der ryger. */
function bekraeftelse(b: Bestilling, nu = new Date()) {
  const hvornaar = `${b.hvordan === "spis_her" ? "spis her" : "afhentning ved lugen"} ${dag(b.hent_dato, nu)} kl. ${kl(b.hent_tid)}`;
  const lover = faarPaamind(b, nu);
  const link = STATUSSIDE + encodeURIComponent(b.reference);
  const navn = fornavn(b.navn);
  const bud = [
    `Tak, ${navn}! Mosede Havnecafe har din bestilling ${nr(b)}: ${hvornaar}.${lover ? " Vi minder dig 30 min før." : ""} Følg den: ${link}`,
    `Tak, ${navn}! ${nr(b)} er bestilt: ${hvornaar}.${lover ? " Påmindelse 30 min før." : ""} ${link}`,
    `${nr(b)} er bestilt: ${hvornaar}.${lover ? " Påmindelse 30 min før." : ""} ${link}`,
    `Tak, ${navn}! Mosede Havnecafe har din bestilling ${nr(b)}: ${hvornaar}.${lover ? " Påmindelse 30 min før." : ""} Spørgsmål: ${TELEFON}`,
  ];
  return bud.find((t) => t.length <= 160) || bud[bud.length - 1].slice(0, 160);
}

function paamindelse(b: Bestilling) {
  const hvad = tapas(b) ? "jeres tapasfad" : "din mad";
  const navn = fornavn(b.navn);
  /* Har køkkenet trykket "Sæt som klar", er den det — så siger vi det */
  if (b.status === "klar") {
    return `Hej ${navn}! ${hvad[0].toUpperCase() + hvad.slice(1)} er klar ved lugen hos Mosede Havnecafe. Sig nummer ${nr(b)}. ${ADRESSE}. Vi ses!`;
  }
  const linje = b.hvordan === "spis_her"
    ? `Om ca. 30 min (kl. ${kl(b.hent_tid)}) er ${hvad} klar hos Mosede Havnecafe. Kom op til lugen og sig nummer ${nr(b)}.`
    : `Om ca. 30 min (kl. ${kl(b.hent_tid)}) er ${hvad} klar ved lugen hos Mosede Havnecafe. Sig nummer ${nr(b)}.`;
  return `Hej ${navn}! ${linje} ${ADRESSE}. Vi ses!`.slice(0, 160);
}

/* Skal den have en påmindelse NU? Mellem 0 og 32 min. til (jobbet
   kører hvert 5. min., så alle rammes én gang), og ikke hvis der
   blev bestilt under en time før — så er bekræftelsen nok. */
function skalPaamindes(b: Bestilling, nu: Date) {
  const n = lokal(nu);
  if (b.hent_dato !== n.iso || !faarSms(b)) return false;
  const t = tilMin(b.hent_tid);
  if (t === null) return false;
  const til = t - n.min;
  if (til <= 0 || til > 32) return false;
  /* Regnet i rigtig tid, ikke i ur-minutter: en bestilling lagt
     23.53 til 00.33 krydser datoen og ville ellers slippe igennem */
  const bestiltFoer = til + (nu.getTime() - Date.parse(b.oprettet)) / 60000;
  return bestiltFoer >= 60;
}

// ---------- slut på teksterne ----------

const env = (k: string) => Deno.env.get(k) ?? "";
const AKTIV = env("SMS_AKTIV").trim().toLowerCase() === "ja";
const KUN_TIL = msisdn(env("SMS_KUN_TIL"));
const AFSENDER = (env("SMS_AFSENDER").trim() || "MosedeHavn").slice(0, 11);
const KOLONNER = "id,reference,lokation_id,navn,telefon,hent_dato,hent_tid,hvordan,bord_nummer,kanal,status,slettet,oprettet,nummer";

async function send(tlf: string | null, besked: string): Promise<boolean> {
  const n = msisdn(tlf);
  if (!n) { console.log("sms: ugyldigt nummer — springer over"); return true; }
  if (KUN_TIL && n !== KUN_TIL) { console.log(`sms: SMS_KUN_TIL er sat — sender ikke til ${n}`); return true; }
  if (!AKTIV) { console.log(`sms (IKKE sendt — SMS_AKTIV er ikke "ja") til ${n}: ${besked}`); return true; }
  const svar = await fetch("https://gatewayapi.com/rest/mtsms", {
    method: "POST",
    headers: { Authorization: `Token ${env("GATEWAYAPI_TOKEN").trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: AFSENDER, message: besked, recipients: [{ msisdn: Number(n) }] }),
  }).catch((e) => { console.error("sms: nettet", String(e)); return null; });
  if (!svar || !svar.ok) {
    console.error("sms fejlede", svar?.status, svar ? await svar.text().catch(() => "") : "");
    return false;
  }
  console.log(`sms sendt til ${n}`);
  return true;
}

const supa = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

/* Gør krav på sms'en: kun den, der når at lægge rækken, sender.
   Fejler afsendelsen, slettes rækken, så næste runde prøver igen. */
const krav = async (id: number, slags: string) => {
  const { error } = await supa.from("sms_sendt").insert({ bestilling_id: id, slags });
  if (error && error.code !== "23505") console.error("sms: kunne ikke markere", slags, error.message);
  return !error;
};
const slip = (id: number, slags: string) =>
  supa.from("sms_sendt").delete().eq("bestilling_id", id).eq("slags", slags);

Deno.serve(async (req: Request) => {
  /* Døren først — mellemrum fra en kopiering tæller ikke */
  const kode = (req.headers.get("x-mosede-secret") || "").trim();
  const forventet = env("PUSH_SECRET").trim();
  if (!forventet || kode !== forventet) {
    console.error(forventet ? "sms: afvist — x-mosede-secret passer ikke med PUSH_SECRET"
      : "sms: afvist — PUSH_SECRET mangler under Edge Functions → Secrets");
    return new Response("forbidden", { status: 401 });
  }
  const kald = await req.json().catch(() => ({}));
  const nu = new Date();

  if (kald.slags === "bekraeft" && kald.id) {
    const { data } = await supa.from("bestillinger").select(KOLONNER).eq("id", kald.id).maybeSingle();
    const b = data as Bestilling | null;
    if (!b || !faarSms(b)) { console.log("sms: bekræftelse springes over (findes ikke / ikke afhentning eller spis her)"); return new Response("ok"); }
    if (await krav(b.id, "bekraeft") && !(await send(b.telefon, bekraeftelse(b, nu)))) await slip(b.id, "bekraeft");
    return new Response("ok");
  }

  if (kald.slags === "paamind") {
    const idag = lokal(nu).iso;
    const { data, error } = await supa.from("bestillinger").select(KOLONNER)
      .eq("lokation_id", LOKATION).eq("hent_dato", idag).is("slettet", null)
      .in("status", AABNE).in("hvordan", ["afhentning", "spis_her"]).is("bord_nummer", null);
    if (error) { console.error("sms: kunne ikke læse bestillingerne", error.message); return new Response("ok"); }
    const kandidater = ((data || []) as Bestilling[]).filter((b) => skalPaamindes(b, nu));
    if (kandidater.length) {
      const { data: sendt } = await supa.from("sms_sendt").select("bestilling_id")
        .eq("slags", "paamind").in("bestilling_id", kandidater.map((b) => b.id));
      const har = new Set((sendt || []).map((r: { bestilling_id: number }) => r.bestilling_id));
      for (const b of kandidater) {
        if (har.has(b.id)) continue;
        if (await krav(b.id, "paamind") && !(await send(b.telefon, paamindelse(b)))) await slip(b.id, "paamind");
      }
    }
    return new Response("ok");
  }

  return new Response("ignored");
});
