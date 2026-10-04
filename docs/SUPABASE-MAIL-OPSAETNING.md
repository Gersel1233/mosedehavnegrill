# Opsætning, før "Glemt koden?" virker

Skrevet 4/10 2026. Knappen står på loginskærmen i `admin.html`, og siden, mailens
link lander på, er `ny-kode.html`. Selve udsendelsen er **Supabases egen** — vi
sender ingen mails selv, og der er ingen hemmelig nøgle i klientkoden.

Projektet er **`epwyjzakvvbxtpvnhvbn`**. Intet andet.

Der er tre ting i Supabase-dashboardet, og uden dem svarer knappen "mailen er
sendt", uden at den er det.

## 1 · SMTP — så mailen overhovedet sendes

**Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**

Uden dette bruger Supabase sin egen afsender, som **kun sender til projektets
egne medlemmer** og højst et par mails i timen. `kontakt@mosedehavnecafe.dk`
ville aldrig få noget.

Felterne udfyldes med mailudbyderens oplysninger for
`kontakt@mosedehavnecafe.dk` — vært, port, brugernavn, adgangskode.
Afsendernavn: `Mosede Havnecafe`.

⚠️ **Adgangskoden hører ikke i repoet.** Den skrives direkte i dashboardet.

## 2 · Hvor linket må pege hen

**Authentication → URL Configuration**

- Site URL: `https://mosedehavnecafe.dk`
- Redirect URLs: `https://mosedehavnecafe.dk/ny-kode.html`

Står adressen ikke på listen, kasserer Supabase den og sender folk til
forsiden i stedet — med nøglen i adresselinjen og ingen side til at bruge den.

## 3 · Mailen på dansk

**Authentication → Email Templates → Reset Password**

Standardteksten er engelsk ("Follow this link to reset the password for your
user"). Et køkken på Mosede Havn skal ikke gætte sig til en engelsk mail.

Emne:

    Ny adgangskode til Mosede Havnecafe

Indhold:

    <h2>Ny adgangskode</h2>
    <p>Der er bedt om en ny adgangskode til personalesystemet
       på Mosede Havnecafe.</p>
    <p><a href="{{ .ConfirmationURL }}">Tryk her for at vælge en ny kode</a></p>
    <p>Linket virker i én time og kan kun bruges én gang.</p>
    <p>Har du ikke selv bedt om det, kan du roligt slette den her mail —
       så sker der ingenting.</p>

`{{ .ConfirmationURL }}` er Supabases eget felt og skal stå præcis sådan.

## Bagefter

Prøv det med en rigtig mail, og se, at den lander — ikke bare at knappen siger
noget. Den, der er værd at prøve først, er `bogholderi@mosedehavnecafe.dk`:
det login er oprettet 15/9 og **aldrig brugt**.
