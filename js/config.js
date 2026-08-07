/* ============================================================
   Mosede Havnegrill og Ishus – forbindelse til databasen.

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

  // Hentet i Supabase: Project Settings → API → "anon" / "public".
  // Kontrolleret: rolle = "anon", projekt = epwyjzakvvbxtpvnhvbn.
  // Den må kun læse – det er adgangsreglerne i databasen der
  // bestemmer det, ikke nøglen selv.
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwd3lqemFrdnZieHRwdm5odmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMDc1ODAsImV4cCI6MjEwMTY4MzU4MH0.zBIiG2I2kcueVmzBAXJx-yP26iUCtAeAAUVDMqm-IMI',
};
