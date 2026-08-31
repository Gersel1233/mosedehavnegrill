-- ============================================================
--  ET BILLEDE PR. VARE  (31. aug 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER menukort.sql og nyheder-slags-og-billede.sql
--  (spanden 'nyheder' og dens fire adgangsregler kommer derfra).
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Kundens ord 31/8 om bestillingen ved bordet: *"du skal gøre, så
--  hver en ting har billede, som de selv kan lægge ind i admin —
--  og priser og udsolgt eller andet."*
--
--  Prisen og udsolgt har ejeren kunnet styre siden 24/8. Billedet
--  var det, der manglede, og det er dét, der afgør, om en gæst
--  ved bordet tør bestille noget, hun ikke kender navnet på.
--
--  ------------------------------------------------------------
--  ⚠️ SAMME SPAND SOM NYHEDERNE — INGEN NY
--  ------------------------------------------------------------
--  En ny storage-spand er fire adgangsregler, ejeren skal oprette
--  i dashboardet i hånden, og indtil han gør det, kan der ikke
--  lægges ét billede op — uden at nogen kan se hvorfor. Spanden
--  'nyheder' findes, er offentlig at læse og kun skrivbar for
--  personalet, og forsidens fotos bruger den allerede af præcis
--  den grund (29/8).
--
--  ⚠️ VÆRNET ER ADRESSENS FORM, og det er ikke pynt: kolonnen kan
--  kun skrives af personalet, men et felt, der tager imod en
--  hvilken som helst URL, er et sted at hænge et fremmed script
--  eller et sporingsbillede op på gæstens telefon. Kun vores egen
--  spand.
-- ============================================================

begin;

alter table public.menu_varer
  add column if not exists billede text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vare_billede_ok') then
    alter table public.menu_varer
      add constraint vare_billede_ok
      check (billede is null
             or (billede ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/nyheder/'
                 and length(billede) <= 500));
  end if;
end $$;

comment on column public.menu_varer.billede is
  'Adressen på et foto i storage-spanden nyheder. Tom = rækken står '
  'uden billede, og det er den rigtige standard: en grå pladsholder '
  'lover ingenting, men et stockfoto lover en ret, vi ikke har set.';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'menu_varer'
      and column_name = 'billede')
    as "kolonnen billede findes (skal vaere 1)",
  (select count(*) from pg_constraint where conname = 'vare_billede_ok')
    as "vaernet om adressen staar (skal vaere 1)";
