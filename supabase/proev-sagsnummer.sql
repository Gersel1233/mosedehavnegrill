/* ============================================================
   PRØVE: SAGSNUMRE PÅ FORESPØRGSLER, BAGLOKALET OG TILMELDINGER
   ------------------------------------------------------------
   Kør EFTER supabase/sagsnummer.sql. Filen SKRIVER og ruller
   det hele tilbage til sidst — den efterlader ingenting.

   ⚠️ DEN LÅNER IKKE EJERENS DATA. Den opretter sin egen
   forretning med sine egne rækker. Fire prøvefiler faldt hos
   kunden i sensommeren, fordi de lånte hans dag, hans vare,
   hans borde eller hans kategori — og arvede alt, hvad der stod
   på dem (5/9, 9/9). Adressen, postnummeret og byen er med,
   fordi lokationer har dem som not null (setup.sql linje 101).
   ============================================================ */
begin;

do $$
declare
  n1 integer; n2 integer; n3 integer; n4 integer;
  r  text;
  ok integer := 0; fejl integer := 0;
  procedure_dummy int;
begin
  insert into public.lokationer (id, navn, adresse, postnr, by)
    values ('proev-sagsnr', 'Prøveforretning', 'Prøvevej 1', '9999', 'Prøveby')
  on conflict (id) do nothing;

  -- 1) FØRSTE FORESPØRGSEL FÅR NUMMER 1
  insert into public.forespoergsler
    (reference, lokation_id, type, navn, telefon, besked)
    values ('FO-P-1', 'proev-sagsnr', 'selskab', 'En', '20304050', 'x')
    returning nummer into n1;
  if n1 = 1 then ok := ok + 1; raise notice 'BESTOD 1: første forespørgsel fik nr. 1';
  else fejl := fejl + 1; raise notice 'FEJLEDE 1: fik % (ventede 1)', n1; end if;

  -- 2) NÆSTE FÅR 2 — TÆLLEREN TÆLLER
  insert into public.forespoergsler
    (reference, lokation_id, type, navn, telefon, besked)
    values ('FO-P-2', 'proev-sagsnr', 'catering', 'To', '20304051', 'x')
    returning nummer into n2;
  if n2 = 2 then ok := ok + 1; raise notice 'BESTOD 2: næste forespørgsel fik nr. 2';
  else fejl := fejl + 1; raise notice 'FEJLEDE 2: fik % (ventede 2)', n2; end if;

  -- 3) ⚠️ HVER SLAGS HAR SIN EGEN TÆLLER. Delte de tal, ville
  --    udlejningen her få nr. 3, og personalet ville tro, der
  --    manglede to udlejninger.
  insert into public.udlejninger
    (reference, lokation_id, navn, telefon, dato, antal_personer, besked)
    values ('UD-P-1', 'proev-sagsnr', 'Tre', '20304052', current_date + 30, 20, 'x')
    returning nummer into n3;
  if n3 = 1 then ok := ok + 1; raise notice 'BESTOD 3: baglokalet har sin EGEN tæller (nr. 1)';
  else fejl := fejl + 1; raise notice 'FEJLEDE 3: fik % (ventede 1 — tællerne er blandet)', n3; end if;

  -- 4) ⚠️ KLIENTENS BUD SMIDES VÆK. Kunne browseren sætte
  --    nummeret, kunne to gæster sende det samme — og et tal,
  --    der er sat udefra, er ikke et løbenummer.
  insert into public.forespoergsler
    (reference, lokation_id, type, navn, telefon, besked, nummer)
    values ('FO-P-3', 'proev-sagsnr', 'selskab', 'Fire', '20304053', 'x', 9999)
    returning nummer into n4;
  if n4 = 3 then ok := ok + 1; raise notice 'BESTOD 4: gæstens bud (9999) blev smidt væk, fik nr. 3';
  else fejl := fejl + 1; raise notice 'FEJLEDE 4: fik % (ventede 3)', n4; end if;

  -- 5) GÆSTEN KAN SLÅ SIT EGET NUMMER OP
  if public.mosede_sagsnummer('FO-P-1') = 1 then
    ok := ok + 1; raise notice 'BESTOD 5: opslaget svarer på en reference, man HAR';
  else fejl := fejl + 1; raise notice 'FEJLEDE 5: opslaget svarede % ', public.mosede_sagsnummer('FO-P-1'); end if;

  -- 6) ⚠️ OG KUN PÅ EN, DER FINDES. Et opslag, der svarede på
  --    hvad som helst, ville være en vej ind i tallene.
  if public.mosede_sagsnummer('FO-FINDES-IKKE') is null then
    ok := ok + 1; raise notice 'BESTOD 6: en ukendt reference får ingenting';
  else fejl := fejl + 1; raise notice 'FEJLEDE 6: en ukendt reference fik et svar'; end if;

  -- 7) ⚠️ INGEN unique PÅ nummer — MED VILJE. Et sammenstød skal
  --    give to kort med samme tal, ikke en AFVIST forespørgsel.
  --    En tabt forespørgsel er dyrere end et gentaget tal.
  begin
    update public.forespoergsler set nummer = 1 where reference = 'FO-P-2';
    ok := ok + 1; raise notice 'BESTOD 7: to sager MÅ have samme nummer (ingen unique)';
  exception when unique_violation then
    fejl := fejl + 1; raise notice 'FEJLEDE 7: der er sat unique på nummer — et sammenstød afviser nu en sag';
  end;

  -- 8) TILMELDINGER HAR OGSÅ SIN EGEN
  insert into public.kalender (lokation_id, type, dato, titel, offentlig, tilmelding, pladser, start_kl)
    values ('proev-sagsnr', 'arrangement', current_date + 10, 'Prøvefest', true, true, 20, '18:00');
  insert into public.reservationer
    (kalender_id, lokation_id, reference, navn, telefon, antal_personer)
    values ((select id from public.kalender where lokation_id='proev-sagsnr' limit 1),
            'proev-sagsnr', 'RE-P-1', 'Fem', '20304054', 2)
    returning nummer into n1;
  if n1 = 1 then ok := ok + 1; raise notice 'BESTOD 8: tilmeldinger har sin EGEN tæller (nr. 1)';
  else fejl := fejl + 1; raise notice 'FEJLEDE 8: fik % (ventede 1)', n1; end if;

  raise notice '----------------------------------------';
  raise notice 'ALLE % AF % BESTOD', ok, ok + fejl;
end $$;

rollback;
