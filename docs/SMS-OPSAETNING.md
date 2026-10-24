# Sms til gæsten — sådan slås det til

**Status 24/10 2026: bygget, men SLUKKET.** Intet er lagt op i Supabase, og der sendes
ingen sms, før ejeren selv har sagt ja og trinnene herunder er gjort. Ejeren sagde 15/9
nej til "Din mad er klar" ved bordene — *"for dyrt i længden"* — og det står stadig:
**ved bordene (QR) kommer der aldrig en sms.**

## Hvad gæsten får

Kun når der bestilles **afhentning** eller **spis her** på hjemmesiden. Ikke levering,
ikke ved bordet, og ikke bordbookinger, forespørgsler eller arrangementer.

1. **Med det samme:**
   *Tak, Mikkel! M-0047 er bestilt: afhentning ved lugen i dag kl. 13.30. Påmindelse 30 min før. mosedehavnecafe.dk/min-bestilling/?ref=SM261024-KTPQR*
2. **Ca. 30 min før:**
   *Hej Mikkel! Om ca. 30 min (kl. 13.30) er din mad klar ved lugen hos Mosede Havnecafe. Sig nummer M-0047. Havnevej 20I, Greve. Vi ses!*
   - Ved **spis her** står der i stedet: *"… klar hos Mosede Havnecafe. Kom op til lugen og sig nummer M-0047."*
   - Ved **tapas** står der *"jeres tapasfad"* i stedet for *"din mad"*.
   - Har køkkenet trykket **Sæt som klar**, står der *"Din mad er klar ved lugen"*.

Linket fører til `min-bestilling/`, hvor gæsten kan følge bestillingen live. Nummeret er
det samme, gæsten siger højt ved lugen.

**Hvornår der IKKE kommer en påmindelse:** når der er bestilt under en time før (så er
bekræftelsen nok), og når bestillingen er afvist, hentet, udeblevet eller ligger i
skraldespanden. **Afvis er stadig et opkald** — sms'en ændrer ikke ejerens regel.

Hver besked er én sms (højst 160 tegn), så en bestilling koster **2 sms'er**: ca. 60 øre
i alt hos GatewayAPI (se den aktuelle pris på gatewayapi.com).

**En sms kan aldrig stoppe en bestilling.** Bestillingen gemmes først. Går noget galt
med sms'en, er bestillingen der stadig (prøvet i `supabase/proev-sms.sql`, prøve 3).

---

## Når ejeren siger ja — ca. 20 minutter, én gang

⚠️ **Mosede er Supabase-projektet `epwyjzakvvbxtpvnhvbn`.** Tjek adresselinjen, før du
trykker noget. Aldrig spiis' `jhdlxexgrwvuoqetcgbt`.

### Trin 1: Sms-konto (GatewayAPI), i ejerens navn
1. Opret en konto på **gatewayapi.com** med Mosedes oplysninger og kort, og bekræft mail og telefon.
2. Sæt et beløb ind, fx 100 kr.
3. Gå til **API → API Keys**, opret en nøgle og kopiér **Token**.

### Trin 2: Læg funktionen op
1. Gå til Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Skriv navnet `send-sms`, præcis sådan.
3. Slet eksempelkoden, og indsæt hele `supabase/funktioner/send-sms.ts` (på GitHub: knappen **Copy raw file**).
4. Tryk **Deploy**.
5. Åbn funktionen → **Details**, slå **Verify JWT FRA** og tryk **Save**. Det er det samme som på send-push.

### Trin 3: Hemmelige værdier
Gå til **Edge Functions → Secrets** og tilføj:

| Navn | Værdi |
|---|---|
| `GATEWAYAPI_TOKEN` | token'et fra trin 1 |
| `SMS_KUN_TIL` | dit eget mobilnummer, fx `12345678` |

`PUSH_SECRET` findes allerede fra send-push. Sms'en bruger den samme, så der er ikke
noget nyt at huske. **`SMS_AKTIV` sættes IKKE endnu.** Indtil den står til `ja`, sender
funktionen ingenting. Den skriver bare i loggen, hvad den *ville* have sendt.

### Trin 4: Databasen
1. Gå til **SQL Editor → New query**, indsæt hele `supabase/sms.sql` og tryk **Run**.
   Alle fire kolonner skal vise **true**.
   Står "push-webhooken" til false, mangler push-opsætningen (se README under "Push").
   Står "påmindelsen hvert 5. minut" til false, så slå `pg_cron` til under
   **Database → Extensions** og kør filen igen.
2. Tryk **New query**, indsæt `supabase/proev-sms.sql` og tryk **Run**. Der skal stå
   **ALLE 9 AF 9 BESTOD**. Fejlen til sidst er med vilje: den ruller prøven tilbage, og
   der sendes intet.

### Trin 5: Prøv det på din egen telefon
1. Sæt `SMS_AKTIV` = `ja` under Secrets. `SMS_KUN_TIL` står stadig, så sms'erne går
   KUN til dig.
2. Bestil en afhentning på hjemmesiden med **dit eget nummer**, mindst en time frem.
3. Bekræftelsen kommer med det samme, og påmindelsen kommer ca. 30 min før.
4. Læg testbestillingen i skraldespanden i admin bagefter.

Kommer der ingen sms, så se **Edge Functions → send-sms → Logs**. Der står grunden:
"SMS_KUN_TIL er sat", "SMS_AKTIV er ikke ja", "afvist", "ugyldigt nummer" eller
"sms fejlede".

### Trin 6: Tænd for alle gæster
Gå til **Edge Functions → Secrets** og slet `SMS_KUN_TIL`. Så er det færdigt.

---

## Sluk igen
Sæt `SMS_AKTIV` til `nej` under Edge Functions → Secrets. Så stopper det med det samme,
og intet andet ændrer sig. Skal det helt væk, står de to linjer nederst i `supabase/sms.sql`.

## Til den, der skal rette i det
- `supabase/sms.sql` indeholder tabellen `sms_sendt` (hvem har fået hvad), udløseren
  `sms_ny_bestilling` og pg_cron-jobbet `mosede-sms-paamind`. Bestillingen selv røres
  aldrig. Et stempel på den ville give en "rettet"-linje i logbogen for hver sms.
- `supabase/funktioner/send-sms.ts` indeholder teksterne og reglerne. Hvem der får sms,
  står både i udløseren og i `faarSms`. Ret begge.
- Adressen og hemmeligheden lånes fra webhooken `push_bestillinger`, ligesom
  `ugepaamindelse.sql` gør.
