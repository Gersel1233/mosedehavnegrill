-- ============================================================
--  ENGANGS-RETTELSE
--  ------------------------------------------------------------
--  Kør KUN denne fil hvis du allerede havde kørt setup.sql
--  FØR åbningstiderne og adressen blev bekræftet af kunden.
--
--  Har du IKKE kørt setup.sql endnu: spring denne over. Den nye
--  setup.sql har allerede de rigtige tal.
--
--  Hvorfor filen findes: startdataen i setup.sql er skrevet med
--  "on conflict do nothing", så den rører ikke rækker der
--  allerede står i databasen. Det er med vilje – ellers ville en
--  ny kørsel af setup.sql overskrive alt personalet havde rettet
--  i admin. Prisen for den sikkerhed er at en rettelse til
--  startdataen skal køres selvstændigt, som her.
--
--  Alt herunder kan også laves i admin uden SQL. Det er kun
--  hurtigere sådan her.
--
--  Filen kan køres to gange uden skade.
-- ============================================================


-- ------------------------------------------------------------
--  1) Adressen: Havnevej 20I
--     Bogstavet I som i Ida – ikke tallet 1. De to ser ens ud i
--     næsten alle skrifttyper, så hvis nogen senere "retter" det
--     til 201, er det en tastefejl.
-- ------------------------------------------------------------
update public.lokationer
   set adresse = 'Havnevej 20I'
 where id = 'mosede';


-- ------------------------------------------------------------
--  2) Åbningstider: 10:00–20:00
--     ------------------------------------------------------------
--     Kun de dage der IKKE er sat til lukket, og kun hvis de
--     stadig står med et af de gamle gæt. Har personalet
--     allerede rettet en dag i admin til noget andet, bliver den
--     ikke rørt – deres rettelse er nyere end vores gæt.
--
--     De gamle gæt var 11:00-21:00 (første udgave) og
--     11:00-20:00 (efter kunden oplyste lukketiden).
-- ------------------------------------------------------------
update public.aabningstider
   set aabner = '10:00',
       lukker = '20:00'
 where lokation_id = 'mosede'
   and lukket = false
   and aabner = '11:00'
   and lukker in ('21:00', '20:00');


-- ------------------------------------------------------------
--  Se hvad der nu står
-- ------------------------------------------------------------
select adresse, postnr, by
  from public.lokationer
 where id = 'mosede';

select case ugedag
         when 0 then 'mandag'  when 1 then 'tirsdag' when 2 then 'onsdag'
         when 3 then 'torsdag' when 4 then 'fredag'  when 5 then 'lørdag'
         else 'søndag'
       end as dag,
       lukket, aabner, lukker
  from public.aabningstider
 where lokation_id = 'mosede'
 order by ugedag;
