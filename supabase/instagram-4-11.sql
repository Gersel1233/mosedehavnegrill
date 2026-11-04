-- ============================================================
--  INSTAGRAM: DEN RIGTIGE PROFIL  (4. november 2026)
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Kan køres igen uden at ødelægge noget.
--
--  Chefen: "det er stadig den forkerte Instagram-konto, der linkes
--  til". Hjemmesiden tager adressen fra indstillingen
--  social_instagram (Indstillinger → Instagram i admin), som siden
--  9/9 har peget på mosedehavnegrillogishus — den tidligere ejers.
--  Den rigtige er mosedehavnecafe_ishus (Mikkel 4/11).
--
--  Det samme kan gøres i admin: Indstillinger → Instagram → sæt
--  adressen ind → Gem.
-- ============================================================
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'social_instagram', to_jsonb('https://www.instagram.com/mosedehavnecafe_ishus/'::text), now())
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();

select vaerdi #>> '{}' as "Instagram på hjemmesiden nu"
  from public.indstillinger where lokation_id = 'mosede' and noegle = 'social_instagram';
