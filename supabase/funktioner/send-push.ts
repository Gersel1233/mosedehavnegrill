/* ============================================================
   EDGE FUNCTION: send-push  (fase 5c)
   ------------------------------------------------------------
   Den ENESTE kode i Mosede, der kører på en server. Alt andet er
   statiske filer — men en push skal SENDES i det øjeblik, rækken
   lander i databasen, og det kan en browser ikke gøre.

   Kæden (se README under "Push: sådan siger telefonen til"):

     gæst sender noget
       → rækken lander i databasen
       → Database Webhook (kun ved INSERT)
       → POST hertil
       → Web Push ud til de telefoner, der har sagt ja

   SÅDAN LÆGGES DEN OP (Supabase-dashboardet):
     1. Edge Functions → Deploy a new function → navn: send-push
        → sæt HELE denne fil ind
     2. "Verify JWT" skal være SLÅET FRA — ellers kan webhooken
        ikke nå den. Døren er i stedet headeren x-mosede-secret,
        og den tjekkes som det allerførste.
     3. Secrets (Edge Functions → Secrets), fire styk:
          PUSH_SECRET        - samme værdi som webhookens header
          VAPID_OFFENTLIG    - den offentlige nøgle (står også i
                               js/admin/push.js — den er offentlig
                               med vilje, som anon-nøglen)
          VAPID_PRIVAT       - den private nøgle. MÅ ALDRIG i
                               repoet eller i klientkode
          VAPID_EMAIL        - en e-mail, push-tjenesterne kan
                               skrive til, fx mailto:chef@...
        (SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY ligger der
        automatisk — de skal ikke oprettes.)
     4. Database → Webhooks: FIRE hooks, én pr. tabel
        (bestillinger, forespoergsler, bordbestillinger,
        udlejninger), alle: kun INSERT → HTTP POST til
        .../functions/v1/send-push med headeren
        x-mosede-secret = PUSH_SECRET.
   ============================================================ */

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

/* Beskeden pr. tabel. record er hele den nye række, som webhooken
   sender med — men KUN det, personalet skal bruge for at vide, om
   de skal gå hen til skærmen nu, kommer med i teksten. En push
   kan ligge på en låseskærm; gæstens telefonnummer skal ikke stå
   dér.

   ⚠️ SKREVET OM 31/8. Kundens ord: beskederne skal være "bedre
   og pænere, og forklar hvad det er og hvad tid". Tre ting var
   direkte forkerte i de gamle:

   · "har bestilt smørrebrød" stod på HVER bestilling — også en
     burger, en levering og en bordbestilling. En push, der siger
     noget forkert, holder man op med at læse.
   · "Ring og bekræft" på bordønsket — booket er booket (kundens
     egen regel, sagt fire gange): opkaldet hører til AFVIS.
   · Frokostordningen fandtes ikke i typelisten og blev til
     "noget".

   Datoen skrives som "i dag"/"i morgen"/"lørdag 5/9" i DANSK
   tid — funktionen kører i skyen på UTC, og "i dag" må ikke
   skifte ved 22-tiden. */
function pænDato(iso: unknown): string {
  const s = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const dansk = (t: number) =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" })
      .format(new Date(t)); // YYYY-MM-DD
  if (s === dansk(Date.now())) return "i dag";
  if (s === dansk(Date.now() + 864e5)) return "i morgen";
  const d = new Date(s + "T12:00:00Z");
  const ugedag = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag",
    "fredag", "lørdag"][d.getUTCDay()];
  return `${ugedag} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function pænTid(t: unknown): string {
  const s = String(t ?? "").slice(0, 5);
  return /^\d{2}:\d{2}$/.test(s) ? s.replace(":", ".") : "";
}

/* Omfanget — "3 retter" er forskellen på at gå derhen nu og om
   lidt. Tælles af linjerne; navnene på maden holdes UDE af
   låseskærmen, kortet i admin har dem. */
function retter(r: Record<string, unknown>): string {
  const l = Array.isArray(r?.linjer)
    ? (r.linjer as Array<Record<string, unknown>>) : [];
  let n = 0;
  for (const x of l) n += Number(x?.antal) || 0;
  if (!n) return "mad";
  return n === 1 ? "1 ret" : `${n} retter`;
}

function bygBesked(tabel: string, r: Record<string, unknown>) {
  const navn = String(r?.navn ?? "").split(/\s+/)[0] || "en gæst";
  const antal = r?.antal_personer ? `${r.antal_personer} personer` : "";

  if (tabel === "bestillinger") {
    /* Bordet først: den skal laves NU og bæres ud — det er en
       anden slags travlhed end en afhentning kl. 17. */
    if (r?.bord_nummer) {
      return {
        titel: `Bord ${r.bord_nummer} har bestilt 🍽️`,
        tekst: `${retter(r)} — skal laves nu og bæres ud til bordet. Betales ved lugen.`,
      };
    }
    const hvornår = [pænDato(r?.hent_dato),
      pænTid(r?.hent_tid) ? "kl. " + pænTid(r?.hent_tid) : ""]
      .filter(Boolean).join(" ");
    if (r?.hvordan === "levering") {
      return {
        titel: "Ny bestilling — skal LEVERES 🚗",
        tekst: `${navn} · ${retter(r)} · ${hvornår}. Adressen står i admin — leveringer bekræftes aldrig automatisk.`,
      };
    }
    return {
      titel: "Ny bestilling 🥪",
      tekst: `${navn} henter ${retter(r)} ${hvornår}`
        + (r?.hvordan === "spis_her" ? " — dækkes op til spis her." : "."),
    };
  }
  if (tabel === "forespoergsler") {
    const typer: Record<string, string> = {
      catering: "catering", baglokale: "baglokalet", selskab: "et selskab",
      frokost: "en frokostordning",
    };
    const dato = pænDato(r?.dato);
    return {
      titel: "Ny forespørgsel 💬",
      tekst: `${navn} spørger om ${typer[String(r?.type)] ?? "noget"}`
        + `${antal ? " til " + antal : ""}${dato ? " · " + dato : ""}. `
        + "Svar dem på mail eller telefon — helst inden et døgn.",
    };
  }
  if (tabel === "bordbestillinger") {
    /* Booket er booket: gæsten regner med bordet, og opkaldet
       hører til Afvis — ikke til hver eneste booking. */
    return {
      titel: "Nyt bord booket 🪑",
      tekst: `${navn} · ${antal || "?"} · ${pænDato(r?.dato) || "?"} kl. ${pænTid(r?.tid) || "?"}. `
        + "Booket er booket — ring kun, hvis I må afvise.",
    };
  }
  if (tabel === "udlejninger") {
    return {
      titel: "Baglokalet 🔑",
      tekst: `${navn} spørger om lokalet ${pænDato(r?.dato) || "?"}`
        + `${antal ? " · " + antal : ""}. Husk: ét ja pr. dag.`,
    };
  }
  return null; // en tabel, vi ikke sender push om
}

Deno.serve(async (req) => {
  /* DØREN, FØR ALT ANDET. Uden den kunne hvem som helst på
     internettet kalde adressen og få køkkenets telefoner til at
     bippe — eller tømme funktionens kvote. */
  const hemmelighed = Deno.env.get("PUSH_SECRET");
  if (!hemmelighed || req.headers.get("x-mosede-secret") !== hemmelighed) {
    return new Response("nej", { status: 401 });
  }

  const data = await req.json().catch(() => null);
  if (!data || data.type !== "INSERT" || !data.record) {
    return Response.json({ ignored: true });
  }

  const besked = bygBesked(String(data.table), data.record);
  if (!besked) return Response.json({ ignored: true });

  webpush.setVapidDetails(
    Deno.env.get("VAPID_EMAIL") ?? "mailto:kontakt@lesreg.dk",
    Deno.env.get("VAPID_OFFENTLIG")!,
    Deno.env.get("VAPID_PRIVAT")!,
  );

  /* service_role: funktionen er på indersiden og må læse listen.
     Nøglen ligger som secret hos Supabase selv — den er ALDRIG i
     nærheden af klientkoden. */
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const lokation = String(data.record.lokation_id ?? "mosede");
  const { data: enheder, error } = await db
    .from("push_abonnementer")
    .select("id, endpoint, p256dh, auth")
    .eq("lokation_id", lokation);

  if (error) return Response.json({ fejl: error.message }, { status: 500 });

  let sendt = 0;
  let ryddet = 0;

  await Promise.all((enheder ?? []).map(async (e) => {
    try {
      await webpush.sendNotification(
        { endpoint: e.endpoint, keys: { p256dh: e.p256dh, auth: e.auth } },
        JSON.stringify({ ...besked, url: "/mosedehavnegrill/admin.html" }),
      );
      sendt++;
    } catch (fejl) {
      /* 404/410: abonnementet findes ikke mere — appen er slettet,
         eller tilladelsen trukket tilbage. Rækken ryddes op, så
         listen i admin viser telefoner, der faktisk får besked. */
      const kode = (fejl as { statusCode?: number })?.statusCode;
      if (kode === 404 || kode === 410) {
        await db.from("push_abonnementer").delete().eq("id", e.id);
        ryddet++;
      }
      // Andre fejl (net, kvote) ignoreres: næste INSERT prøver igen.
    }
  }));

  return Response.json({ sendt, ryddet });
});
