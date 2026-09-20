-- ============================================================
--  EN LEVERING SKAL VÆRE VALIDERET AF SERVEREN  (20. sep 2026)
--  ------------------------------------------------------------
--  Indtil i dag kunne en gæst skrive hvad som helst i adressefeltet.
--  Værnet bestilling_levering_adresse_ok kontrollerer kun, at der
--  STÅR noget — fem til tre hundrede tegn. Og browseren kiggede
--  efter det første firecifrede tal i teksten. "Aalborgvej 5, 2670"
--  gik igennem.
--
--  Nu gælder: en leveringsbestilling fra en GÆST skal bære en
--  kvittering, som serveren selv har udstedt efter et opslag hos
--  Dataforsyningen. Kvitteringen er en række i
--  leverings_valideringer, og gæsten kan hverken læse eller skrive
--  i den tabel.
--
--  ⚠️ ADRESSEN PÅ BESTILLINGEN OVERSKRIVES med kvitteringens.
--     Det er hele pointen: sender nogen et gyldigt token sammen med
--     "En falsk adresse i Aalborg", ryger teksten på gulvet, og
--     køkkenet får den adresse, DAWA bekræftede. Klientens felt er
--     aldrig autoritativt.
--
--  ⚠️ ZONEN REGNES IGEN HER, ikke bare aflæst af kvitteringen.
--     Flytter ejeren grænsen, mens en gæst står med et gammelt
--     token, skal det nye område gælde. Kvitteringens `zone` er
--     derfor kun til fejlsøgning.
--
--  ⚠️ KUN 'ja' MÅ SENDES. Ejerens beslutning fra 4/9
--     (Frederiksberg-sagen): *"en levering, forretningen ikke kan
--     køre, må ikke kunne sendes — den ender ellers i køkkenets
--     liste med en tid, ingen kan holde."* 'spoerg' betyder "ring
--     til os", ikke "bestil online".
--
--  ⚠️ KUN GÆSTEN. Personalet tager bestillinger i telefonen og skal
--     ikke igennem et adresseopslag for at skrive en adresse, de
--     kender. Samme skel som mosede_gaestens_regler: auth.jwt() ->>
--     'role' = 'anon'.
--
--  ⚠️ OG DEN KRÆVER, AT BEGGE BESTILLINGSFLADER ER OPDATEREDE.
--     bestil/ sender i dag fri tekst uden token. Går den her i
--     luften alene, holder smørrebrødets levering op med at virke.
--     De skal udgives SAMMEN.
--
--  Kan køres igen. Prøven er proev-levering-valideret.sql.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  KVITTERINGEN
--  ------------------------------------------------------------
--  Skrives KUN af Edge Function'en valider-levering, som kører med
--  service_role. Gæsten får kun tokenet tilbage i svaret og rører
--  aldrig tabellen.
-- ------------------------------------------------------------
create table if not exists public.leverings_valideringer (
  token       text primary key,
  lokation_id text not null,
  dawa_id     text not null,
  adresse     text not null,
  vejnavn     text,
  husnr       text,
  etage       text,
  doer        text,
  postnr      text not null,
  by          text,
  lng         numeric not null,
  lat         numeric not null,
  zone        text not null,
  oprettet    timestamptz not null default now(),
  udloeber    timestamptz not null,
  brugt_af    bigint
);

comment on table public.leverings_valideringer is
  'Serverens egen kvittering på en leveringsadresse, slået op hos Dataforsyningen. Gæsten kan hverken læse eller skrive her (20/9).';
comment on column public.leverings_valideringer.zone is
  'Zonen på udstedelsestidspunktet — kun til fejlsøgning. Udløseren regner den IGEN ved bestillingen.';
comment on column public.leverings_valideringer.brugt_af is
  'Bestillingen, kvitteringen blev brugt til. Et token kan kun bruges én gang.';

/* ⚠️ RLS UDEN EN ENESTE POLITIK. Tom betyder lukket: hverken anon
   eller authenticated kan røre tabellen. service_role går udenom,
   og det er kun Edge Function'en, der har den. Kunne gæsten LÆSE
   tabellen, kunne hun stjæle en andens token; kunne hun SKRIVE,
   kunne hun udstede sin egen kvittering. */
alter table public.leverings_valideringer enable row level security;

create index if not exists leverings_valideringer_udloeber
  on public.leverings_valideringer (udloeber);

-- Tokenet rejser med bestillingen og bliver stående, så personalet
-- kan slå adressen op igen, hvis noget skal efterprøves.
alter table public.bestillinger
  add column if not exists leverings_token text;

comment on column public.bestillinger.leverings_token is
  'Kvitteringen fra leverings_valideringer. Udløseren kræver den ved levering fra en gæst (20/9).';

-- ------------------------------------------------------------
--  UDLØSEREN
-- ------------------------------------------------------------
create or replace function public.mosede_levering_valideret()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v   public.leverings_valideringer%rowtype;
  v_zone text;
begin
  /* Ikke en levering: tokenet må ikke blive hængende. Et token på en
     afhentning ville se ud som en oplysning, der betyder noget. */
  if coalesce(new.hvordan, '') <> 'levering' then
    new.leverings_token := null;
    return new;
  end if;

  -- Personalet og SQL dømmes ikke. Se hovedet.
  if coalesce(auth.jwt() ->> 'role', '') <> 'anon' then
    return new;
  end if;

  if new.leverings_token is null or btrim(new.leverings_token) = '' then
    raise exception 'levering_ikke_valideret';
  end if;

  /* for update: to bestillinger med samme token i samme sekund skal
     stå i kø, ikke begge slippe igennem. Samme greb som husets fem
     andre lofter. */
  select * into v
    from public.leverings_valideringer
   where token = new.leverings_token
   for update;

  if not found then
    raise exception 'levering_ikke_valideret';
  end if;
  if v.lokation_id is distinct from new.lokation_id then
    raise exception 'levering_ikke_valideret';
  end if;
  if v.brugt_af is not null then
    raise exception 'levering_validering_brugt';
  end if;
  if v.udloeber < now() then
    raise exception 'levering_validering_udloebet';
  end if;

  /* ⚠️ ZONEN REGNES IGEN. Kvitteringens `zone` er fra dengang, den
     blev udstedt; grænsen kan være flyttet siden. */
  v_zone := public.mosede_leveringszone(v.lng, v.lat, new.lokation_id);
  if v_zone <> 'ja' then
    raise exception 'levering_uden_for_omraadet';
  end if;

  /* ⚠️ SERVERENS ADRESSE VINDER. Alt, gæsten skrev i feltet, ryger
     på gulvet her. Det er den linje, der gør manipulation
     ligegyldig. */
  new.leverings_adresse := v.adresse;

  update public.leverings_valideringer
     set brugt_af = new.id
   where token = v.token;

  return new;
end
$function$;

comment on function public.mosede_levering_valideret() is
  'En gæsts levering kræver en serverudstedt kvittering, og adressen overskrives med den validerede (20/9).';

drop trigger if exists bestilling_levering_valideret on public.bestillinger;
create trigger bestilling_levering_valideret
  before insert on public.bestillinger
  for each row execute function public.mosede_levering_valideret();

commit;

select 'kvitteringstabellen findes' as tjek,
       to_regclass('public.leverings_valideringer') is not null as ok
union all
select 'gæsten kan hverken læse eller skrive i den',
       (select relrowsecurity from pg_class where oid = 'public.leverings_valideringer'::regclass)
       and not exists (select 1 from pg_policies
                        where schemaname = 'public' and tablename = 'leverings_valideringer')
union all
select 'bestillinger har et token-felt',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'bestillinger'
                  and column_name = 'leverings_token')
union all
select 'udløseren er sat på bestillinger',
       exists (select 1 from pg_trigger
                where tgname = 'bestilling_levering_valideret' and not tgisinternal)
union all
select 'udløseren overskriver adressen med serverens',
       coalesce(pg_get_functiondef(to_regproc('public.mosede_levering_valideret'))
                like '%new.leverings_adresse := v.adresse%', false)
union all
select 'udløseren regner zonen igen',
       coalesce(pg_get_functiondef(to_regproc('public.mosede_levering_valideret'))
                like '%mosede_leveringszone(v.lng, v.lat%', false);
