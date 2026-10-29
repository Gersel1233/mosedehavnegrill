/* ============================================================
   ⚠️⚠️  DEN HER FIL ER **IKKE** SQL  ⚠️⚠️
   ------------------------------------------------------------
   Den skal ind under **Edge Functions**, ikke i SQL Editor —
   opskriften står i docs/SMS-OPSAETNING.md.
   ============================================================

   EDGE FUNCTION: send-sms  (24/10 — alle husets veje 28/10)
   ------------------------------------------------------------
   ⚠️ 28/10: Mikkel: *"sms ligesom med spiis, bare med alle deres ting
   med levering og frokostordning — de er alle lidt forskellige"*.
   Ud over afhentning og spis her (herunder) får nu også:
     LEVERING      bekræftelse med adresse og tid + "på vej", når
                   køkkenet trykker Sæt som klar
     BORDBOOKING   bekræftelse + påmindelse ca. 2 timer før
     TILMELDING    billet (nummer, pris, afbud senest 24 t før) +
                   påmindelse dagen før fra kl. 10; venteliste for sig
     FORESPØRGSEL  catering, baglokale, selskab og frokostordning:
                   "vi ringer eller skriver inden for et døgn"
   Udløserne står i supabase/sms-alle-28-10.sql. Ved bordet (QR):
   stadig ALDRIG.

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
const AABNE = ["ny", "bekraeftet", "tilberedes", "klar"];
/* ⚠️ "tilberedes" MANGLEDE (29/10). Trykkede køkkenet "Start
   tilberedning" i god tid, fik gæsten aldrig sin påmindelse 30 min
   før — bestillingen var ikke længere "åben" for funktionen. */

type Bestilling = {
  id: number; reference: string; lokation_id: string; navn: string;
  telefon: string | null; hent_dato: string; hent_tid: string;
  hvordan: string; bord_nummer: string | null; kanal: string | null;
  status: string; slettet: string | null; oprettet: string;
  nummer: number | null; leverings_adresse?: string | null;
};
type Tilmelding = {
  id: number; reference: string; lokation_id: string; kalender_id: number;
  navn: string; telefon: string | null; antal_personer: number; status: string;
  slettet: string | null; oprettet: string; nummer: number | null;
};
type Arrangement = {
  id: number; titel: string; dato: string; start_kl: string | null;
  pris_tekst: string | null; aflyst: boolean | null;
};
type Bordbooking = {
  id: number; reference: string; lokation_id: string; navn: string;
  telefon: string | null; dato: string; tid: string; antal_personer: number;
  status: string; slettet: string | null; oprettet: string;
};
type Foresp = {
  id: number; reference: string; lokation_id: string; type: string;
  navn: string; telefon: string | null; nummer: number | null; slettet: string | null;
};

/* Samme regel som udløseren i sms.sql. Tjekkes igen her, fordi en
   række kan være rettet, mellem den blev lagt og vi læser den. */
function faarSms(b: Bestilling): boolean {
  return b.lokation_id === LOKATION
    && (b.hvordan === "afhentning" || b.hvordan === "spis_her" || b.hvordan === "levering")
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
  if (b.hvordan === "levering") return false;
  const n = lokal(nu);
  const t = tilMin(b.hent_tid);
  return b.hent_dato > n.iso || (b.hent_dato === n.iso && t !== null && t - n.min >= 60);
}

/* ÉN sms (højst 160 tegn) — ellers koster den det dobbelte. Den
   første udgave, der kan være der, vinder; linket til statussiden
   er det sidste, der ryger. */
function bekraeftelse(b: Bestilling, nu = new Date()) {
  if (b.hvordan === "levering") return bekraeftLevering(b, nu);
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

/* ---- LEVERING (28/10) ---- */
/* "Strandvejen 12, 2670 Greve" → "Strandvejen 12" — den korte form */
const gade = (a: string | null | undefined) => String(a || "").split(",")[0].trim().slice(0, 40);
function bekraeftLevering(b: Bestilling, nu = new Date()) {
  const navn = fornavn(b.navn);
  const hvornaar = `${dag(b.hent_dato, nu)} ca. kl. ${kl(b.hent_tid)}`;
  const til = gade(b.leverings_adresse);
  const bud = [
    `Tak, ${navn}! Mosede Havnecafe har din bestilling ${nr(b)}: levering ${hvornaar}${til ? " til " + til : ""}. Vi skriver, når maden er på vej. Spørgsmål: ${TELEFON}`,
    `Tak, ${navn}! ${nr(b)} leveres ${hvornaar}${til ? " til " + til : ""}. Vi skriver, når den er på vej. ${TELEFON}`,
    `${nr(b)} leveres ${hvornaar}. Vi skriver, når den er på vej. ${TELEFON}`,
  ];
  return bud.find((t) => t.length <= 160) || bud[bud.length - 1].slice(0, 160);
}
function paaVej(b: Bestilling) {
  const navn = fornavn(b.navn);
  return `Hej ${navn}! Din mad fra Mosede Havnecafe er på vej (${nr(b)}) og er der ca. kl. ${kl(b.hent_tid)}. Spørgsmål: ${TELEFON}`.slice(0, 160);
}

/* ---- TILMELDING (28/10) — billetten i en sms ---- */
const tNr = (t: Tilmelding) =>
  t.nummer && t.nummer > 0 ? "T-" + String(t.nummer).padStart(4, "0") : t.reference;
const titelKort = (s: string) => String(s || "").trim().slice(0, 34);
function bekraeftTilmelding(t: Tilmelding, a: Arrangement, nu = new Date()) {
  const navn = fornavn(t.navn);
  const hvornaar = `${dag(a.dato, nu)}${a.start_kl ? " kl. " + kl(a.start_kl) : ""}`;
  if (t.status === "venteliste") {
    return `Hej ${navn}! Du står på ventelisten til ${titelKort(a.titel)} ${hvornaar} (${tNr(t)}). Bliver der en plads, ringer vi. Mosede Havnecafe`.slice(0, 160);
  }
  const pris = String(a.pris_tekst || "").trim();
  const bud = [
    `Tak, ${navn}! Billet ${tNr(t)}: ${titelKort(a.titel)} ${hvornaar}, ${t.antal_personer} pers.${pris ? " Betales ved kassen." : ""} Afbud senest 24 t før: ${TELEFON}`,
    `Billet ${tNr(t)}: ${titelKort(a.titel)} ${hvornaar}, ${t.antal_personer} pers.${pris ? " Betales ved kassen." : ""} Afbud senest 24 t før: ${TELEFON}`,
    `Billet ${tNr(t)}: ${hvornaar}, ${t.antal_personer} pers. Afbud senest 24 t før: ${TELEFON}`,
  ];
  return bud.find((x) => x.length <= 160) || bud[bud.length - 1].slice(0, 160);
}
function paamindTilmelding(t: Tilmelding, a: Arrangement) {
  const navn = fornavn(t.navn);
  return `Hej ${navn}! I morgen${a.start_kl ? " kl. " + kl(a.start_kl) : ""}: ${titelKort(a.titel)} hos Mosede Havnecafe. Billet ${tNr(t)}, ${t.antal_personer} pers. Forhindret? Ring ${TELEFON}`.slice(0, 160);
}
/* Dagen før, fra kl. 10 — og kun hvis der blev meldt til mindst et
   døgn før (ellers er billetten påmindelse nok). Ikke ventelisten,
   ikke en afvist, og ikke et aflyst arrangement. */
function skalPaamindesTilmelding(t: Tilmelding, a: Arrangement, nu: Date) {
  const n = lokal(nu);
  const imorgen = lokal(new Date(nu.getTime() + 864e5)).iso;
  if (a.dato !== imorgen || a.aflyst || n.min < 10 * 60) return false;
  if (t.slettet || !["ny", "bekraeftet"].includes(t.status) || !String(t.telefon || "").trim()) return false;
  return Date.parse(a.dato + "T00:00:00Z") - Date.parse(t.oprettet) >= 864e5;
}

/* ---- BORDBOOKING (28/10) ---- */
function bekraeftBord(b: Bordbooking, nu = new Date()) {
  const navn = fornavn(b.navn);
  return `Tak, ${navn}! Bord til ${b.antal_personer} ${dag(b.dato, nu)} kl. ${kl(b.tid)} hos Mosede Havnecafe, ${ADRESSE}. Forhindret? Ring ${TELEFON}`.slice(0, 160);
}
function paamindBord(b: Bordbooking) {
  const navn = fornavn(b.navn);
  return `Hej ${navn}! Vi ses i dag kl. ${kl(b.tid)}, bord til ${b.antal_personer} hos Mosede Havnecafe, ${ADRESSE}. Forhindret? Ring ${TELEFON}`.slice(0, 160);
}
/* Ca. 2 timer før (mellem 90 og 125 min. til), og kun hvis der blev
   booket mindst 3 timer før. Ikke en afvist. */
function skalPaamindesBord(b: Bordbooking, nu: Date) {
  const n = lokal(nu);
  if (b.dato !== n.iso || b.slettet || b.status === "afvist" || !String(b.telefon || "").trim()) return false;
  const t = tilMin(b.tid);
  if (t === null) return false;
  const til = t - n.min;
  if (til < 90 || til > 125) return false;
  return til + (nu.getTime() - Date.parse(b.oprettet)) / 60000 >= 180;
}

/* ---- FORESPØRGSEL (28/10) — også frokostordningen ---- */
const FORESP_ORD: Record<string, string> = {
  catering: "catering", baglokale: "baglokalet", selskab: "selskab", frokost: "frokostordning",
};
function bekraeftForesp(f: Foresp) {
  const navn = fornavn(f.navn);
  const hvad = FORESP_ORD[f.type] || "en aftale";
  const fNr = f.nummer && f.nummer > 0 ? "F-" + String(f.nummer).padStart(4, "0") : f.reference;
  return `Tak, ${navn}! Mosede Havnecafe har din forespørgsel på ${hvad} (${fNr}). Vi ringer eller skriver inden for et døgn. Spørgsmål: ${TELEFON}`.slice(0, 160);
}

/* ---- AFVIST (29/10) ----
   Mikkel: beskederne skal hænge sammen, og personalet skal have det
   nemt. Før: et afvist nej stod kun på personalets skærm, og nogen
   skulle huske at ringe. Nu får gæsten det med det samme — og siden
   "Følg din bestilling" siger det samme: vi ringer, ellers ring selv. */
function afvistBestilling(b: Bestilling, nu = new Date()) {
  const navn = fornavn(b.navn);
  const hvad = b.hvordan === "levering" ? "leveringen" : "din bestilling";
  const bud = [
    `Hej ${navn}! Desværre kan Mosede Havnecafe ikke lave ${hvad} ${nr(b)} ${dag(b.hent_dato, nu)} kl. ${kl(b.hent_tid)}. Vi ringer til dig - eller ring selv: ${TELEFON}`,
    `Hej ${navn}! Desværre kan vi ikke lave ${hvad} ${nr(b)}. Vi ringer til dig - eller ring selv: ${TELEFON}. Mosede Havnecafe`,
  ];
  return bud.find((t) => t.length <= 160) || bud[bud.length - 1].slice(0, 160);
}
function afvistBord(b: Bordbooking, nu = new Date()) {
  const navn = fornavn(b.navn);
  return `Hej ${navn}! Desværre kan vi ikke give jer bordet ${dag(b.dato, nu)} kl. ${kl(b.tid)} hos Mosede Havnecafe. Ring gerne, så finder vi en anden tid: ${TELEFON}`.slice(0, 160);
}
function afvistTilmelding(t: Tilmelding, a: Arrangement, nu = new Date()) {
  const navn = fornavn(t.navn);
  const bud = [
    `Hej ${navn}! Desværre kan vi ikke tage imod din tilmelding ${tNr(t)} til ${titelKort(a.titel)} ${dag(a.dato, nu)}. Spørgsmål: ${TELEFON}. Mosede Havnecafe`,
    `Hej ${navn}! Desværre kan vi ikke tage imod din tilmelding ${tNr(t)} til ${titelKort(a.titel)} ${dag(a.dato, nu)}. Spørgsmål: ${TELEFON}`,
  ];
  return bud.find((x) => x.length <= 160) || bud[bud.length - 1].slice(0, 160);
}

// ---------- slut på teksterne ----------

const env = (k: string) => Deno.env.get(k) ?? "";
const AKTIV = env("SMS_AKTIV").trim().toLowerCase() === "ja";
const KUN_TIL = msisdn(env("SMS_KUN_TIL"));
const AFSENDER = (env("SMS_AFSENDER").trim() || "MosedeHavn").slice(0, 11);
/* Udgaven står i loggen ved hver kold start (Edge Functions → send-sms →
   Logs) — så kan man SE, om den udgivne funktion er den nyeste. */
console.log("send-sms · udgave 2026-10-29 · bekræft, påmind, på vej, afvist");
const KOLONNER = "id,reference,lokation_id,navn,telefon,hent_dato,hent_tid,hvordan,bord_nummer,kanal,status,slettet,oprettet,nummer,leverings_adresse";
const T_KOL = "id,reference,lokation_id,kalender_id,navn,telefon,antal_personer,status,slettet,oprettet,nummer";
const A_KOL = "id,titel,dato,start_kl,pris_tekst,aflyst";
const B_KOL = "id,reference,lokation_id,navn,telefon,dato,tid,antal_personer,status,slettet,oprettet";
const F_KOL = "id,reference,lokation_id,type,navn,telefon,nummer,slettet";

/* ⚠️ ÉT TEGN UDEN FOR SMS-TEGNSÆTTET (GSM 03.38) GØR BESKEDEN TIL
   UNICODE — og så er grænsen 70 tegn, ikke 160, og prisen dobbelt.
   Æ, Ø og Å er med; tankestreg, krøllede citationstegn og "…" er ikke. */
const gsm = (t: string) => t.replace(/[–—]/g, "-").replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...");

async function send(tlf: string | null, besked: string): Promise<boolean> {
  besked = gsm(besked);
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
/* Det samme for tilmeldinger, bordbookinger og forespørgsler */
const kravSag = async (kilde: string, id: number, slags: string) => {
  const { error } = await supa.from("sms_sendt_sag").insert({ kilde, sag_id: id, slags });
  if (error && error.code !== "23505") console.error("sms: kunne ikke markere", kilde, slags, error.message);
  return !error;
};
const slipSag = (kilde: string, id: number, slags: string) =>
  supa.from("sms_sendt_sag").delete().eq("kilde", kilde).eq("sag_id", id).eq("slags", slags);
async function sendSag(kilde: string, id: number, slags: string, tlf: string | null, besked: string) {
  if (await kravSag(kilde, id, slags) && !(await send(tlf, besked))) await slipSag(kilde, id, slags);
}

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

  /* ---- afvist (29/10): bestilling, bord og tilmelding ---- */
  if (kald.slags === "afvist" && kald.id && kald.kilde === "bord") {
    const { data: b } = await supa.from("bordbestillinger").select(B_KOL).eq("id", kald.id).maybeSingle();
    if (!b || b.lokation_id !== LOKATION || b.slettet || b.status !== "afvist" || b.dato < lokal(nu).iso) return new Response("ok");
    await sendSag("bord", b.id, "afvist", b.telefon, afvistBord(b as Bordbooking, nu));
    return new Response("ok");
  }
  if (kald.slags === "afvist" && kald.id && kald.kilde === "tilmelding") {
    const { data: t } = await supa.from("reservationer").select(T_KOL).eq("id", kald.id).maybeSingle();
    if (!t || t.lokation_id !== LOKATION || t.slettet || t.status !== "afvist") return new Response("ok");
    const { data: a } = await supa.from("kalender").select(A_KOL).eq("id", t.kalender_id).maybeSingle();
    if (!a || a.dato < lokal(nu).iso) return new Response("ok");
    await sendSag("tilmelding", t.id, "afvist", t.telefon, afvistTilmelding(t as Tilmelding, a as Arrangement, nu));
    return new Response("ok");
  }
  if (kald.slags === "afvist" && kald.id) {
    const { data } = await supa.from("bestillinger").select(KOLONNER).eq("id", kald.id).maybeSingle();
    const b = data as Bestilling | null;
    /* Samme regel som faarSms — men statussen SKAL være afvist */
    if (!b || b.lokation_id !== LOKATION || b.status !== "afvist" || b.slettet || b.bord_nummer || b.kanal === "bord"
        || !["afhentning", "spis_her", "levering"].includes(b.hvordan) || b.hent_dato < lokal(nu).iso) {
      return new Response("ok");
    }
    if (await krav(b.id, "afvist") && !(await send(b.telefon, afvistBestilling(b, nu)))) await slip(b.id, "afvist");
    return new Response("ok");
  }

  /* ---- tilmelding, bordbooking og forespørgsel (28/10) ---- */
  if (kald.slags === "bekraeft" && kald.id && kald.kilde === "tilmelding") {
    const { data: t } = await supa.from("reservationer").select(T_KOL).eq("id", kald.id).maybeSingle();
    if (!t || t.lokation_id !== LOKATION || t.slettet || !["ny", "venteliste", "bekraeftet"].includes(t.status)) return new Response("ok");
    const { data: a } = await supa.from("kalender").select(A_KOL).eq("id", t.kalender_id).maybeSingle();
    if (!a) return new Response("ok");
    await sendSag("tilmelding", t.id, "bekraeft", t.telefon, bekraeftTilmelding(t as Tilmelding, a as Arrangement, nu));
    return new Response("ok");
  }
  if (kald.slags === "bekraeft" && kald.id && kald.kilde === "bord") {
    const { data: b } = await supa.from("bordbestillinger").select(B_KOL).eq("id", kald.id).maybeSingle();
    if (!b || b.lokation_id !== LOKATION || b.slettet || b.status === "afvist") return new Response("ok");
    await sendSag("bord", b.id, "bekraeft", b.telefon, bekraeftBord(b as Bordbooking, nu));
    return new Response("ok");
  }
  if (kald.slags === "bekraeft" && kald.id && kald.kilde === "foresp") {
    const { data: f } = await supa.from("forespoergsler").select(F_KOL).eq("id", kald.id).maybeSingle();
    if (!f || f.lokation_id !== LOKATION || f.slettet) return new Response("ok");
    await sendSag("foresp", f.id, "bekraeft", f.telefon, bekraeftForesp(f as Foresp));
    return new Response("ok");
  }
  if (kald.slags === "paa_vej" && kald.id) {
    const { data } = await supa.from("bestillinger").select(KOLONNER).eq("id", kald.id).maybeSingle();
    const b = data as Bestilling | null;
    if (!b || !faarSms(b) || b.hvordan !== "levering" || b.status !== "klar") return new Response("ok");
    if (await krav(b.id, "paa_vej") && !(await send(b.telefon, paaVej(b)))) await slip(b.id, "paa_vej");
    return new Response("ok");
  }

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

    /* Bordbookinger i dag, ca. 2 timer før (28/10) */
    const { data: borde } = await supa.from("bordbestillinger").select(B_KOL)
      .eq("lokation_id", LOKATION).eq("dato", idag).is("slettet", null).neq("status", "afvist");
    const bordKand = ((borde || []) as Bordbooking[]).filter((b) => skalPaamindesBord(b, nu));
    if (bordKand.length) {
      const { data: sendt } = await supa.from("sms_sendt_sag").select("sag_id")
        .eq("kilde", "bord").eq("slags", "paamind").in("sag_id", bordKand.map((b) => b.id));
      const har = new Set((sendt || []).map((r: { sag_id: number }) => r.sag_id));
      for (const b of bordKand) if (!har.has(b.id)) await sendSag("bord", b.id, "paamind", b.telefon, paamindBord(b));
    }

    /* Tilmeldinger til i morgen, fra kl. 10 (28/10) */
    if (lokal(nu).min >= 10 * 60) {
      const imorgen = lokal(new Date(nu.getTime() + 864e5)).iso;
      const { data: arr } = await supa.from("kalender").select(A_KOL)
        .eq("lokation_id", LOKATION).eq("type", "arrangement").eq("dato", imorgen);
      for (const a of ((arr || []) as Arrangement[])) {
        if (a.aflyst) continue;
        const { data: tt } = await supa.from("reservationer").select(T_KOL)
          .eq("kalender_id", a.id).is("slettet", null).in("status", ["ny", "bekraeftet"]);
        const kand = ((tt || []) as Tilmelding[]).filter((t) => skalPaamindesTilmelding(t, a, nu));
        if (!kand.length) continue;
        const { data: sendt } = await supa.from("sms_sendt_sag").select("sag_id")
          .eq("kilde", "tilmelding").eq("slags", "paamind").in("sag_id", kand.map((t) => t.id));
        const har = new Set((sendt || []).map((r: { sag_id: number }) => r.sag_id));
        for (const t of kand) if (!har.has(t.id)) await sendSag("tilmelding", t.id, "paamind", t.telefon, paamindTilmelding(t, a));
      }
    }
    return new Response("ok");
  }

  return new Response("ignored");
});
