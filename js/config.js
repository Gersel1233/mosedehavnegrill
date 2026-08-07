/* ============================================================
   Mosede Havnegrill & Ishus – forbindelse til databasen.

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

  // ↓ Hentes i Supabase: Project Settings → API → Project API keys
  //   → "anon" / "public". Den starter med "eyJ".
  anonKey: '',
};
