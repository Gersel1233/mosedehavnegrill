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
   dér. */
function bygBesked(tabel: string, r: Record<string, unknown>) {
  const navn = String(r?.navn ?? "").split(/\s+/)[0] || "en gæst";
  const antal = r?.antal_personer ? `${r.antal_personer} personer` : "";

  if (tabel === "bestillinger") {
    return {
      titel: "Ny bestilling 🥪",
      tekst: `${navn} har bestilt smørrebrød til ${r?.hent_dato ?? "?"} kl. ${String(r?.hent_tid ?? "").slice(0, 5)}.`,
    };
  }
  if (tabel === "forespoergsler") {
    const typer: Record<string, string> = {
      catering: "catering", baglokale: "baglokalet", selskab: "et selskab",
    };
    return {
      titel: "Ny forespørgsel 💬",
      tekst: `${navn} spørger om ${typer[String(r?.type)] ?? "noget"}${antal ? " · " + antal : ""}. Der skal ringes.`,
    };
  }
  if (tabel === "bordbestillinger") {
    return {
      titel: "Bordønske 🍽️",
      tekst: `${navn} · ${antal || "?"} · ${r?.dato ?? "?"} kl. ${String(r?.tid ?? "").slice(0, 5)}. Ring og bekræft.`,
    };
  }
  if (tabel === "udlejninger") {
    return {
      titel: "Baglokalet 🔑",
      tekst: `${navn} spørger om lokalet ${r?.dato ?? "?"}${antal ? " · " + antal : ""}. Husk: ét ja pr. dag.`,
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
