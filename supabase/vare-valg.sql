-- ============================================================
--  VALG PÅ EN VARE ER DATA — IKKE EN SÆTNING I NAVNET  (15. sep 2026)
--  ------------------------------------------------------------
--  Kundens ord: "vi skal lave det mest dygtige og fejlfri system".
--  Gennemgangen talte ~30 varer, hvor valget stod i NAVNET eller i
--  BESKRIVELSEN: "Pitabrød — med kebab, kylling eller tun", "Lumumba —
--  kold eller varm", "Dåse eller flaske sodavand". Gæsten kunne ikke
--  vælge, og køkkenet fik "2 × Pitabrød" og måtte ringe og spørge.
--
--  Kolonnen menu_varer.valg er en LISTE af valgmuligheder. Hvert valg
--  er sin egen linje i kurven og på bonen (linjens `variant`, som
--  huset har haft siden 30/8), med sin egen tæller. PRISEN er varens —
--  et valg koster ikke ekstra (tillæg er deres egne varer, fx "Ekstra
--  kylling, kebab eller oksekød", og står på kortet som sådan).
--
--  ⚠️ INGEN VARE FÅR VALG AF DEN HER FIL. Listerne er ejerens: admin
--     viser et forslag pr. vare, og ejeren trykker "Brug forslaget".
--     En fil, der satte valgene, ville ændre, hvad gæsten skal svare
--     på, uden at ejeren har set det.
--
--  ⚠️ OG DATABASEN HOLDER VALGET: har en vare valg, skal gæstens linje
--     have et af dem (gaestens-regler.sql kender kolonnen fra nu af).
--     Uden det kunne en gammel fane sende "Pitabrød" uden fyld, og så
--     står køkkenet og gætter igen.
--
--  Kan køres igen. Prøven er proev-vare-valg.sql.
-- ============================================================
begin;

alter table public.menu_varer add column if not exists valg jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vare_valg_ok') then
    alter table public.menu_varer add constraint vare_valg_ok check (
      valg is null
      or (jsonb_typeof(valg) = 'array'
          and jsonb_array_length(valg) between 2 and 12
          and length(valg::text) <= 600));
  end if;
end $$;

commit;

select 'menu_varer.valg findes' as tjek,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'menu_varer'
                  and column_name = 'valg') as ok
union all
select 'valg er en liste med 2-12 muligheder',
       exists (select 1 from pg_constraint where conname = 'vare_valg_ok');
