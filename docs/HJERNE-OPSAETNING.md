# Hjernen til opgavelisterne — sådan slås den til

**Status 4/11 2026: bygget, men SLUKKET.** Indtil trinene herunder er gjort, læser admin
filerne med den enkle læser i browseren (som før). Intet går i stykker.

## Hvad den gør

Mikkel 4/11: *"det skal være en hjerne, der læser dokumentet, og hvad Jim sådan vil med
hans dokument og formålet med det, og laver lister ud fra det."*

Når en chef vælger en fil under **Opgaver → Læg en ny liste ind**, sendes den til
funktionen `laes-opgaver` (`supabase/funktioner/laes-opgaver.ts`), som beder Claude
(Anthropic) læse den. Claude svarer med færdige lister i et fast format:

- titel, afsnit og opgaver — skrevet kort og tydeligt, med forfatterens egne ord
- hvilken periode listen gælder ("uge 46-47", "de næste 5 dage", "10/11-23/11")
- hvilke dage en opgave står ("Mandag:", "hver fredag", "Fredag 13/11")
- om der skal skrives en værdi (temperatur, antal, beløb)
- hvem der er ansvarlig, hvis dokumentet siger det og personen er på holdet
- flere lister, hvis dokumentet rummer adskilte rutiner
- en kort forklaring til chefen: *"Sådan har jeg forstået dokumentet"*

Den læser **PDF, Word, Excel, tekst — og fotos af papirlister** (også håndskrift).
Cheferne ser altid udkastet og retter, før noget gemmes. Hjernen gemmer aldrig selv.

## Pris

Typisk 50 øre til 1 kr. pr. dokument (Claude Opus 5.5). Prisen ses på console.anthropic.com →
**Usage**. Sæt gerne et loft under **Limits**, fx 50 kr. om måneden.

## Sådan slås den til — ca. 10 minutter, én gang

⚠️ **Mosede er Supabase-projektet `epwyjzakvvbxtpvnhvbn`.** Tjek adresselinjen.

### Trin 1: En nøgle hos Anthropic (i husets navn)
1. Gå til **console.anthropic.com** og opret en konto med Mosedes oplysninger.
2. **Billing** → sæt et beløb ind (fx 100 kr.), og sæt et loft under **Limits**.
3. **API Keys** → **Create Key** → navn "mosede opgaver" → kopiér nøglen (starter med `sk-ant-`).
   Den vises kun én gang. Læg den aldrig i en mail, en chat eller i koden.

### Trin 2: Læg nøglen i Supabase
1. Supabase → **Edge Functions** → **Secrets** → **Add new secret**.
2. Navn: `ANTHROPIC_API_KEY` — værdi: nøglen. **Save**.

### Trin 3: Læg funktionen op
1. **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Navn: `laes-opgaver`, præcis sådan.
3. Slet eksemplet, og sæt hele `supabase/funktioner/laes-opgaver.ts` ind
   (på GitHub: knappen **Copy raw file**). Tryk **Deploy**.
4. **Verify JWT skal være SLÅET TIL** (det er standard) — modsat send-sms og send-push.
   Kun cheferne kan bruge den; funktionen spørger selv databasen.

### Trin 4: Prøv
Admin → **Opgaver** → **Læg en ny liste ind** → **🧪 Prøv med et eksempel**. Der skal stå
*"🧠 Læser …"* og bagefter en grøn boks: *"Sådan har jeg forstået dokumentet"*.
Står der *"Hjernen svarede ikke"*, så tjek trin 2 og 3 (Edge Functions → laes-opgaver → **Logs**).

## Sikkerhed
- Nøglen ligger kun i Supabase Secrets — aldrig i browseren eller i git.
- Kun logget-ind chefer (rollen `ejer`) kan kalde funktionen.
- Dokumentet sendes til Anthropic for at blive læst. Læg ikke personfølsomme papirer
  (CPR-numre, helbred) ind som opgavelister.
