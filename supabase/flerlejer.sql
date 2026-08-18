-- ============================================================
--  FLERLEJER — én database, flere forretninger
--  ------------------------------------------------------------
--  Køres ÉN GANG på en database der allerede har data i.
--  setup.sql er rettet med, så en frisk installation får den
--  rigtige form med det samme.
--
--  Filen er idempotent: den kan køres igen uden at ødelægge
--  noget. Det er ikke pænhed — det er fordi en migration der kun
--  kan køres én gang, er en migration man ikke tør køre.
--
--  ------------------------------------------------------------
--  HVORFOR NU, MED ÉN KUNDE
--  ------------------------------------------------------------
--  Skemaet blev bygget omkring en lokationer-tabel, så det meste
--  har lokation_id i forvejen. Men to steder mangler det, og de
--  to er nok til at kunde nr. 2 ville skrive oven i kunde nr. 1:
--
--    indstillinger  har noegle som primærnøgle. Der findes altså
--                   ÉN "dagens_besked" i hele databasen.
--    nyheder        har intet lokation_id overhovedet.
--
--  Dertil er der et mønster der skal vendes om. menu_kategorier
--  med lokation_id = null betød "fælles for alle lokationer", og
--  det var rigtigt da lokationer var to udsalgssteder i samme
--  forretning. Med flere KUNDER betyder "fælles" pludselig at
--  Mosedes menukort er synligt hos den næste. Derfor bliver
--  lokation_id påkrævet, og alt det eksisterende bliver 'mosede'.
--
--  ------------------------------------------------------------
--  ADGANG: FRA "ER DU ADMIN" TIL "ER DU ADMIN HER"
--  ------------------------------------------------------------
--  is_admin() slog e-mailen op i en liste skrevet ind i koden.
--  Med flere kunder skal en chef kunne se sit eget og intet
--  andet, og listen skal kunne rettes uden at køre SQL.
--
--  Derfor en tabel: admin_adgang(email, lokation_id).
--  is_admin_for(lokation) slår op i den.
--  is_admin() bliver "er du admin for noget som helst" og bruges
--  kun der hvor rækken ikke selv peger på en lokation.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) HVEM ER ADMIN, OG HVOR
-- ------------------------------------------------------------
create table if not exists public.admin_adgang (
  email       text not null,
  lokation_id text not null references public.lokationer(id) on delete cascade,
  oprettet    timestamptz not null default now(),
  primary key (email, lokation_id)
);

comment on table public.admin_adgang is
  'Hvem må styre hvilken forretning. En e-mail kan stå flere gange.';

/* DE E-MAILS DER ALLEREDE HAR ADGANG, FLYTTER MED.

   Her stod først en e-mail skrevet ind i hånden, og det var en
   fælde. Adgangen i den kørende database ligger i listen inde i
   is_admin(), og den blev rettet til chefens rigtige e-mail, da
   setup.sql blev kørt. En håndskrevet pladsholder her ville
   derfor IKKE flytte adgangen med — den ville give adgang til en
   adresse, der ikke findes, og lukke chefen ude af sin egen
   admin i samme åndedrag. Det er den værste slags fejl: alt ser
   ud til at være lykkedes, og først næste gang nogen skal rette
   en pris, opdager man det.

   I stedet læses listen ud af den funktion, der faktisk står i
   databasen lige nu. Så er det umuligt at glemme at rette noget.

   Mønsteret leder efter alt, der ligner en e-mail i
   funktionskroppen. Finder den ingenting — fordi setup.sql aldrig
   blev rettet — siger beskeden det højt i stedet for at gå
   videre i stilhed. */
do $$
declare
  krop     text;
  fundne   text[];
  e        text;
  antal    int := 0;
begin
  if not exists (select 1 from public.lokationer where id = 'mosede') then
    raise notice 'Ingen lokation "mosede" endnu — springer adgangen over.';
    return;
  end if;

  select p.prosrc into krop
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'is_admin';

  if krop is null then
    raise notice 'is_admin() findes ikke — er setup.sql kørt?';
    return;
  end if;

  select array_agg(distinct m[1]) into fundne
    from regexp_matches(krop, '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', 'g') m;

  foreach e in array coalesce(fundne, array[]::text[])
  loop
    if e = 'UDFYLD-CHEFENS-EMAIL@eksempel.dk' then
      raise warning 'is_admin() indeholder stadig pladsholderen. '
        'Ret setup.sql til chefens rigtige e-mail, ellers er der ingen der kan '
        'logge ind i admin.';
      continue;
    end if;
    insert into public.admin_adgang (email, lokation_id)
    values (e, 'mosede') on conflict do nothing;
    antal := antal + 1;
    raise notice 'Adgang flyttet med: % → mosede', e;
  end loop;

  if antal = 0 then
    raise warning 'INGEN e-mails flyttet med fra is_admin(). Ingen kan logge ind '
      'i admin, før du lægger en række i public.admin_adgang.';
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) FUNKTIONERNE
--    security definer med låst search_path, som den gamle:
--    funktionen kører med ejerens rettigheder og kan derfor ikke
--    fejle på grund af en gæsts manglende adgang og tage hele
--    hjemmesiden med sig.
-- ------------------------------------------------------------
create or replace function public.is_admin_for(lok text) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.lokation_id = lok
      and a.email = coalesce(auth.jwt() ->> 'email', '')
  );
$$;

-- "Er du admin for noget som helst." Bruges kun hvor rækken ikke
-- selv peger på en lokation.
create or replace function public.is_admin() returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.email = coalesce(auth.jwt() ->> 'email', '')
  );
$$;

revoke all on function public.is_admin_for(text) from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin_for(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ------------------------------------------------------------
-- 3) INDSTILLINGER: PRIMÆRNØGLEN BLIVER (lokation_id, noegle)
--    ----------------------------------------------------------
--    Det her er den vigtigste ændring i filen. Uden den skriver
--    kunde nr. 2 i kunde nr. 1's "dagens besked".
-- ------------------------------------------------------------
alter table public.indstillinger
  add column if not exists lokation_id text;

update public.indstillinger set lokation_id = 'mosede' where lokation_id is null;

alter table public.indstillinger
  alter column lokation_id set not null;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'indstillinger'
      and constraint_name = 'indstillinger_lokation_fk'
  ) then
    alter table public.indstillinger
      add constraint indstillinger_lokation_fk
      foreign key (lokation_id) references public.lokationer(id) on delete cascade;
  end if;
end $$;

-- Primærnøglen skiftes ud. Navnet på den gamle er Postgres'
-- standard, men vi slår det op frem for at gætte.
do $$
declare
  gammel text;
begin
  select constraint_name into gammel
  from information_schema.table_constraints
  where table_schema = 'public' and table_name = 'indstillinger'
    and constraint_type = 'PRIMARY KEY';

  if gammel is not null and gammel <> 'indstillinger_pk_lokation' then
    execute format('alter table public.indstillinger drop constraint %I', gammel);
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'indstillinger'
      and constraint_name = 'indstillinger_pk_lokation'
  ) then
    alter table public.indstillinger
      add constraint indstillinger_pk_lokation primary key (lokation_id, noegle);
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) NYHEDER FÅR EN LOKATION
-- ------------------------------------------------------------
alter table public.nyheder
  add column if not exists lokation_id text;

update public.nyheder set lokation_id = 'mosede' where lokation_id is null;

do $$
begin
  if exists (select 1 from public.lokationer where id = 'mosede') then
    alter table public.nyheder alter column lokation_id set default 'mosede';
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'nyheder'
      and constraint_name = 'nyheder_lokation_fk'
  ) then
    alter table public.nyheder
      add constraint nyheder_lokation_fk
      foreign key (lokation_id) references public.lokationer(id) on delete cascade;
  end if;
end $$;

-- ------------------------------------------------------------
-- 5) "FÆLLES" MENUKORT BLIVER MOSEDES
--    ----------------------------------------------------------
--    lokation_id = null betød "fælles for alle lokationer". Det
--    var rigtigt for to udsalgssteder i samme forretning. Med
--    flere KUNDER betyder det, at Mosedes menukort dukker op hos
--    den næste, og det er ikke en indstilling — det er en fejl.
-- ------------------------------------------------------------
update public.menu_kategorier set lokation_id = 'mosede' where lokation_id is null;

alter table public.menu_kategorier
  alter column lokation_id set not null;

-- menu_varer arver sin lokation fra kategorien. Kolonnen står
-- alligevel PÅ varen, så både adgangsreglen og hentningen kan
-- filtrere uden at slå kategorien op hver gang.
alter table public.menu_varer
  add column if not exists lokation_id text;

update public.menu_varer v
   set lokation_id = k.lokation_id
  from public.menu_kategorier k
 where k.id = v.kategori_id
   and (v.lokation_id is distinct from k.lokation_id);

alter table public.menu_varer
  alter column lokation_id set not null;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'menu_varer'
      and constraint_name = 'menu_varer_lokation_fk'
  ) then
    alter table public.menu_varer
      add constraint menu_varer_lokation_fk
      foreign key (lokation_id) references public.lokationer(id) on delete cascade;
  end if;
end $$;

/* Varen må ikke kunne komme til at pege på en anden lokation end
   sin kategori. Det ville give et menukort hvor en vare hører til
   ét sted og står et andet, og den slags opdager man ikke på
   skærmen — man opdager det når en gæst bestiller noget, der ikke
   findes. */
create or replace function public.menu_vare_arver_lokation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select k.lokation_id into new.lokation_id
    from public.menu_kategorier k
   where k.id = new.kategori_id;
  return new;
end $$;

drop trigger if exists menu_vare_lokation on public.menu_varer;
create trigger menu_vare_lokation
  before insert or update of kategori_id on public.menu_varer
  for each row execute function public.menu_vare_arver_lokation();

-- ------------------------------------------------------------
-- 6) ADGANGSREGLERNE BINDES TIL LOKATIONEN
--    ----------------------------------------------------------
--    Læsning er stadig åben for alle: menukort og åbningstider
--    ER offentlige. Det er SKRIVNING der skal bindes.
--
--    Tre separate regler i stedet for én "for all" — se noten i
--    setup.sql. "for all" ville også gælde læsning, og så skulle
--    hver eneste gæst køre et opslag bare for at se menukortet.
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'aabningstider', 'lukkedage', 'menu_kategorier',
    'menu_varer', 'nyheder', 'indstillinger'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_opret_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_ret_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_slet_admin', t);

    execute format(
      'create policy %I on public.%I for insert
         with check (public.is_admin_for(lokation_id))',
      t || '_opret_admin', t);
    execute format(
      'create policy %I on public.%I for update
         using (public.is_admin_for(lokation_id))
         with check (public.is_admin_for(lokation_id))',
      t || '_ret_admin', t);
    execute format(
      'create policy %I on public.%I for delete
         using (public.is_admin_for(lokation_id))',
      t || '_slet_admin', t);
  end loop;
end $$;

-- lokationer: rækken ER lokationen, så id'et er nøglen.
-- Bemærk at der IKKE er en insert-regel: en ny forretning
-- oprettes af os i Supabase, ikke af en kunde gennem admin.
drop policy if exists lokationer_opret_admin on public.lokationer;
drop policy if exists lokationer_ret_admin   on public.lokationer;
drop policy if exists lokationer_slet_admin  on public.lokationer;

create policy lokationer_ret_admin on public.lokationer
  for update using (public.is_admin_for(id)) with check (public.is_admin_for(id));

-- admin_adgang: kun læsbar for den der selv står i den, og kun
-- skrivbar af os. En kunde må ikke kunne give sig selv adgang til
-- naboens forretning.
alter table public.admin_adgang enable row level security;

drop policy if exists admin_adgang_laes on public.admin_adgang;
create policy admin_adgang_laes on public.admin_adgang
  for select using (email = coalesce(auth.jwt() ->> 'email', ''));

-- ------------------------------------------------------------
-- 7) BESTILLINGER
--    Gæsten må stadig skrive og ikke læse. Det nye er, at
--    personalet kun kan læse SIN egen lokations bestillinger.
--    Det er den vigtigste enkeltregel i hele filen: en
--    bestilling er navn og telefonnummer på et menneske.
-- ------------------------------------------------------------
drop policy if exists bestillinger_laes_admin on public.bestillinger;
drop policy if exists bestillinger_ret_admin  on public.bestillinger;
drop policy if exists bestillinger_slet_admin on public.bestillinger;

create policy bestillinger_laes_admin on public.bestillinger
  for select using (public.is_admin_for(lokation_id));

create policy bestillinger_ret_admin on public.bestillinger
  for update using (public.is_admin_for(lokation_id))
  with check (public.is_admin_for(lokation_id));

create policy bestillinger_slet_admin on public.bestillinger
  for delete using (public.is_admin_for(lokation_id));

commit;

-- ------------------------------------------------------------
--  BAGEFTER
--  ------------------------------------------------------------
--  1. Ret e-mailen i admin_adgang til chefens rigtige.
--  2. Kør supabase/proev-flerlejer.sql. Den opretter to lokationer
--     og prøver at læse på tværs. Består den ikke, er der en
--     forretning der kan se en andens bestillinger.
-- ------------------------------------------------------------
