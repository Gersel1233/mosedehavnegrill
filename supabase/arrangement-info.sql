-- ============================================================
--  ET ARRANGEMENT SKAL KUNNE BÆRE ET BILLEDE  (30. august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER arrangementer.sql og nyheder-slags-og-billede.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Kundens ord 30/8: reservationen til arrangementerne virker
--  ikke, "og alle de oplysninger havnegrillen skal bruge —
--  eventuelt info, billeder, alt muligt".
--
--  Teksten kunne den godt (beskrivelse, pris, klokkeslæt,
--  pladser). Billedet kunne den ikke — og et arrangement uden et
--  billede er en linje tekst i en liste. Det er ikke noget, man
--  sætter et kryds i kalenderen for.
--
--  ------------------------------------------------------------
--  ⚠️ SAMME SPAND SOM NYHEDERNE, IKKE EN NY
--  ------------------------------------------------------------
--  Billedet lægges i storage-spanden "nyheder", som allerede har
--  sine fire adgangsregler (nyheder-slags-og-billede.sql). En ny
--  spand ville betyde et nyt sæt regler, ejeren skal oprette i
--  dashboardet — og den dag han glemmer det, kan der ikke lægges
--  et billede op, uden at nogen kan sige hvorfor.
--
--  Kolonnen gemmer ADRESSEN, ikke billedet. Det er den samme
--  aftale som nyheder.billede.
-- ============================================================

do $$
begin
  if not exists (select 1 from public.lokationer where id = 'mosede') then
    raise exception 'Forkert projekt: lokationen "mosede" findes ikke her. Kører du i spiis-projektet?';
  end if;
end $$;

alter table public.kalender add column if not exists billede text;

comment on column public.kalender.billede is
  'Adressen på et foto i storage-spanden "nyheder". Vises på kalendersiden og i arrangementets eget lag. Tom = ingen billede, og så står der ingen grå kasse.';

-- ------------------------------------------------------------
--  RAPPORT
-- ------------------------------------------------------------
select
  (select count(*) from public.kalender
    where lokation_id = 'mosede' and type = 'arrangement')          as arrangementer,
  (select count(*) from public.kalender
    where lokation_id = 'mosede' and type = 'arrangement'
      and coalesce(tilmelding, false))                              as tager_imod_reservationer,
  (select count(*) from public.kalender
    where lokation_id = 'mosede' and type = 'arrangement'
      and billede is not null)                                      as har_billede,
  case
    when (select count(*) from public.kalender
           where lokation_id = 'mosede' and type = 'arrangement') = 0
      then 'Der er ingen arrangementer endnu. Læg et ind i admin under Kalender.'
    when (select count(*) from public.kalender
           where lokation_id = 'mosede' and type = 'arrangement'
             and coalesce(tilmelding, false)) = 0
      then '⚠️ INTET ARRANGEMENT TAGER IMOD RESERVATIONER. Derfor er der ingen '
           || '"Reservér plads"-knap på kalendersiden. Åbn arrangementet i admin '
           || '→ Kalender og sæt hak i "Gæsterne skal kunne reservere plads".'
    else 'Klar. Reservationsfeltet står på kalendersiden.'
  end                                                               as saadan_staar_det;
