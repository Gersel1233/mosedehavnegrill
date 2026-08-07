-- ============================================================
--  ENGANGS-RETTELSE
--  ------------------------------------------------------------
--  Kør KUN denne fil hvis du allerede havde kørt setup.sql
--  FØR adressen og lukketiden blev bekræftet af kunden.
--
--  Hvorfor den findes: startdataen i setup.sql er skrevet med
--  "on conflict do nothing", så den rører ikke rækker der
--  allerede står i databasen. Det er med vilje – ellers ville
--  en ny kørsel af setup.sql overskrive alt personalet havde
--  rettet i admin. Prisen for den sikkerhed er at en rettelse
--  til startdataen skal køres selvstændigt, som her.
--
--  Har du IKKE kørt setup.sql endnu: spring denne over. Den nye
--  setup.sql har allerede de rigtige tal.
--
--  Alt herunder kan også laves i admin uden SQL. Det er kun
--  hurtigere sådan her.
-- ============================================================


-- ------------------------------------------------------------
--  1) Adressen
--     Kunden oplyser Havnevej 201. Bemærk at forretningens egen
--     Facebook-side skriver "Havnevej 20", og andre kilder
--     skriver 20I. Ret tallet herunder hvis 201 er forkert.
-- ------------------------------------------------------------
update public.lokationer
   set adresse = 'Havnevej 201'
 where id = 'mosede';


-- ------------------------------------------------------------
--  2) Lukketiden – 20:00, ikke 21:00
--     Kun de dage der IKKE er sat til lukket, og kun hvis de
--     stadig står med den gamle lukketid. Har personalet
--     allerede rettet en dag i admin, bliver den ikke rørt.
-- ------------------------------------------------------------
update public.aabningstider
   set lukker = '20:00'
 where lokation_id = 'mosede'
   and lukket = false
   and lukker = '21:00';


-- ------------------------------------------------------------
--  Se hvad der nu står
-- ------------------------------------------------------------
select l.adresse, l.postnr, l.by from public.lokationer l where l.id = 'mosede';

select ugedag, lukket, aabner, lukker
  from public.aabningstider
 where lokation_id = 'mosede'
 order by ugedag;
