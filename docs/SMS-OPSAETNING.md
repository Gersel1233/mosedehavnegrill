# Sms til gæsten — sådan slås det til

**Status 24/10 2026: bygget, men SLUKKET.** Intet er lagt op i Supabase, og der sendes
ingen sms, før ejeren selv har sagt ja og trinnene herunder er gjort. Ejeren sagde 15/9
nej til "Din mad er klar" ved bordene — *"for dyrt i længden"* — og det står stadig:
**ved bordene (QR) kommer der aldrig en sms.**

## Hvad gæsten får (28/10: alle husets veje)

Mikkel 28/10: *"sms ligesom med spiis, bare med alle deres ting med levering og
frokostordning — de er alle lidt forskellige"*. Hver vej har sin egen besked. Alle er
på højst 160 tegn, så hver besked koster én sms:

| Vej | Med det samme | Senere |
|---|---|---|
| **Afhentning** | *Tak, Mikkel! M-0047 er bestilt: afhentning ved lugen i dag kl. 13.30. Påmindelse 30 min før. (link)* | ca. 30 min før: *Om ca. 30 min er din mad klar ved lugen …* |
| **Spis her** | samme, med "spis her" | ca. 30 min før: *… Kom op til lugen og sig nummer M-0047.* |
| **Levering** | *Tak, Mikkel! M-0047 leveres i dag ca. kl. 13.30 til Strandvejen 112. Vi skriver, når den er på vej. 28 87 13 43* | når køkkenet trykker **Sæt som klar**: *Din mad … er på vej (M-0047) og er der ca. kl. 13.30.* |
| **Bordbooking** | *Tak, Lone! Bord til 6 i dag kl. 18.00 hos Mosede Havnecafe, Havnevej 20I, Greve. Forhindret? Ring 28 87 13 43* | ca. 2 timer før: *Vi ses i dag kl. 18.00, bord til 6 …* |
| **Tilmelding** | *Tak, Anna! Billet T-0012: Fredagsbar … lør. 31/10 kl. 20.00, 4 pers. Betales ved kassen. Afbud senest 24 t før: 28 87 13 43* | dagen før fra kl. 10: *I morgen kl. 20.00: Fredagsbar … Billet T-0012, 4 pers.* |
| **Venteliste** | *Du står på ventelisten til … Bliver der en plads, ringer vi.* | — |
| **Forespørgsel** (catering, baglokale, selskab, **frokostordning**) | *Tak, Ole! Mosede Havnecafe har din forespørgsel på frokostordning (F-0031). Vi ringer eller skriver inden for et døgn.* | — |

**Ved bordene (QR) kommer der stadig aldrig en sms** (ejerens nej 15/9).

**Hvornår der IKKE kommer en påmindelse:** når der er bestilt/booket/meldt til så kort
tid før, at bekræftelsen er påmindelse nok; når sagen er afvist, hentet, udeblevet eller
ligger i skraldespanden; og når et arrangement er aflyst. **Afvis er stadig et opkald.**

Pris: ca. 30 øre pr. sms hos GatewayAPI. En bestilling eller booking koster 2 sms'er, en
forespørgsel 1 (se den aktuelle pris på gatewayapi.com).

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
2. Tryk **New query**, indsæt `supabase/sms-alle-28-10.sql` og tryk **Run**. Alle fem
   kolonner skal vise **true**. (Den giver levering, bordbookinger, tilmeldinger og
   forespørgsler deres egne sms'er.)
3. Tryk **New query**, indsæt `supabase/proev-sms.sql` og tryk **Run**. Der skal stå
   **ALLE 9 AF 9 BESTOD**. Gør det samme med `supabase/proev-sms-alle-28-10.sql`:
   **ALLE 11 AF 11 BESTOD**. Fejlen til sidst er med vilje: den ruller prøven tilbage, og
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
og intet andet ændrer sig. Skal det helt væk, står linjerne nederst i `supabase/sms.sql`
og `supabase/sms-alle-28-10.sql`.

## Til den, der skal rette i det
- `supabase/sms.sql` indeholder tabellen `sms_sendt` (hvem har fået hvad), udløseren
  `sms_ny_bestilling` og pg_cron-jobbet `mosede-sms-paamind`. Bestillingen selv røres
  aldrig. Et stempel på den ville give en "rettet"-linje i logbogen for hver sms.
- `supabase/funktioner/send-sms.ts` indeholder teksterne og reglerne. Hvem der får sms,
  står både i udløseren og i `faarSms`. Ret begge.
- Adressen og hemmeligheden lånes fra webhooken `push_bestillinger`, ligesom
  `ugepaamindelse.sql` gør.
