/* ============================================================
   Mosede Havnecafe – forbindelse til databasen.

   Anon-nøglen herunder er lavet til at ligge offentligt på en
   hjemmeside. Det er adgangsreglerne i databasen (RLS) der
   bestemmer hvad den må – og den må kun læse.

   ⚠️  Læg ALDRIG "service_role"-nøglen her. Den springer alle
       adgangsregler over, og den ligger på samme side i Supabase
       lige under anon-nøglen. Det er nem at forveksle dem.

   Er url eller anonKey tom, kører hele siden videre lokalt i
   browseren. Praktisk under udvikling, og siden går ikke ned
   hvis databasen er nede.
   ============================================================ */

window.MOSEDE_CLOUD = {
  url: 'https://epwyjzakvvbxtpvnhvbn.supabase.co',

  /* HVILKEN FORRETNING ER DEN HER SIDE?
     ----------------------------------------------------------
     Databasen har plads til flere. Hver række i menukort,
     åbningstider, nyheder, indstillinger og bestillinger bærer
     et lokation_id, og siden henter kun sit eget.

     Det er ikke en hemmelighed. Det står i adressen på hver
     eneste forespørgsel alligevel, og det er ikke DET, der
     holder to forretninger adskilt – det gør adgangsreglerne i
     databasen (se supabase/flerlejer.sql). Skriver man et andet
     id her, ser man et andet menukort. Man kan stadig ikke læse
     nogens bestillinger.

     Næste kunde får sin egen udgave af siden med sit eget id. */
  lokation: 'mosede',

  /* HJERNEN TIL OPGAVERNE (4/11): adressen på Edge Function'en
     supabase/funktioner/laes-opgaver.ts. Den hedder "laes-opgaver" i
     dashboardet, men Supabase gav den adressen "clever-function", da
     den blev oprettet — og adressen følger ikke med, når navnet rettes.
     Målt 4/11: clever-function svarer 403 "kun_cheferne" uden login. */
  hjerne: 'clever-function',

  // Hentet i Supabase: Project Settings → API → "anon" / "public".
  // Kontrolleret: rolle = "anon", projekt = epwyjzakvvbxtpvnhvbn.
  // Den må kun læse – det er adgangsreglerne i databasen der
  // bestemmer det, ikke nøglen selv.
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd3lqemFrdnZieHRwdm5odmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMDc1ODAsImV4cCI6MjEwMTY4MzU4MH0.zBIiG2I2kcueVmzBAXJx-yP26iUCtAeAAUVDMqm-IMI',
};
