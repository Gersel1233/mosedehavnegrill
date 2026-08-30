/* ============================================================
   PRØVE: RESERVATIONER TIL ARRANGEMENTER  (30/8-2026)
   ------------------------------------------------------------
   Kør EFTER arrangementer.sql. Den skriver testrækker, læser dem
   og RULLER ALT TILBAGE — der bliver ikke en eneste række tilbage
   i forretningens data.

   Prøven er skrevet, så den kan FEJLE: hver linje beviser noget,
   der ville være galt uden filen.
   ============================================================ */

begin;

create temporary table proev_svar (nr int, hvad text, resultat text)
  on commit drop;

insert into public.lokationer (id, navn, aktiv)
  values ('proev-arr', 'Prøve', true) on conflict (id) do nothing;

do $$
declare
  koncert  bigint;
  kigforbi bigint;
  intern   bigint;
  igaar    bigint;
  ok       boolean;
  n        int;
begin
  -- Et offentligt arrangement med tilmelding og fire pladser.
  insert into public.kalender (lokation_id, type, dato, titel, offentlig,
                               tilmelding, pladser)
    values ('proev-arr', 'arrangement', current_date + 7, 'Koncert', true, true, 4)
    returning id into koncert;

  -- Et offentligt arrangement UDEN tilmelding: kig bare forbi.
  insert into public.kalender (lokation_id, type, dato, titel, offentlig, tilmelding)
    values ('proev-arr', 'arrangement', current_date + 7, 'Musik på molen', true, false)
    returning id into kigforbi;

  -- Personalets egen note. Den må ingen melde sig til.
  insert into public.kalender (lokation_id, type, dato, titel, offentlig, tilmelding)
    values ('proev-arr', 'arrangement', current_date + 7, 'Bent har ferie', false, true)
    returning id into intern;

  -- Overstået.
  insert into public.kalender (lokation_id, type, dato, titel, offentlig,
                               tilmelding, pladser)
    values ('proev-arr', 'arrangement', current_date - 1, 'I gaar', true, true, 10)
    returning id into igaar;

  /* 1) EN GÆST KAN MELDE SIG TIL. Hele pointen. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon, antal_personer)
      values ('RE-P1', 'proev-arr', koncert, 'Anna Vind', '20304050', 2);
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (1, 'en gaest kan reservere plads',
    case when ok then '✅ BESTOD' else '❌ FEJLEDE' end);

  /* 2) PLADSERNE TÆLLES. Fire pladser, to er taget — nummer to
        med tre personer skal afvises. Det er DEN linje, der gør
        det bulletproof: to gæster på den sidste plads samtidig. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon, antal_personer)
      values ('RE-P2', 'proev-arr', koncert, 'For Mange', '20304051', 3);
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (2, 'der kan ikke reserveres flere end pladserne',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);

  /* 3) MEN DE SIDSTE TO KAN. En bremse, der siger nej til alt, er
        ikke en bremse — den er en lukket dør. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon, antal_personer)
      values ('RE-P3', 'proev-arr', koncert, 'Lige Plads', '20304052', 2);
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (3, 'de sidste pladser kan stadig tages',
    case when ok then '✅ BESTOD' else '❌ FEJLEDE' end);

  /* 4) ET AFSLAG FRIGIVER PLADSEN. Ellers spærrer en aflyst
        reservation for en, der gerne vil — og ingen opdager det,
        for skærmen viser jo, at der er sagt nej. */
  update public.reservationer set status = 'afvist' where reference = 'RE-P3';
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon, antal_personer)
      values ('RE-P4', 'proev-arr', koncert, 'Efter Afslag', '20304053', 2);
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (4, 'et afslag frigiver pladsen igen',
    case when ok then '✅ BESTOD' else '❌ FEJLEDE' end);

  /* 5) ET ARRANGEMENT UDEN TILMELDING TAGER IKKE IMOD. "Kig bare
        forbi" er ikke en tilmeldingsliste. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon)
      values ('RE-P5', 'proev-arr', kigforbi, 'Uindbudt', '20304054');
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (5, 'uden tilmelding kan der ikke reserveres',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);

  /* 6) ⚠️ PERSONALETS EGEN NOTE ER IKKE ET ARRANGEMENT. En
        fremmed, der gætter et id, må ikke kunne melde sig til
        "Bent har ferie" — og dermed få at vide, at rækken findes. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon)
      values ('RE-P6', 'proev-arr', intern, 'Gaettet Id', '20304055');
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (6, 'en intern kalenderraekke kan ikke reserveres',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);

  /* 7) EN OVERSTÅET DAG. En formular, der står åben i en gammel
        fane, må ikke kunne sende. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon)
      values ('RE-P7', 'proev-arr', igaar, 'For Sent', '20304056');
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (7, 'et overstaaet arrangement tager ikke imod',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);

  /* 8) ⚠️ VISNINGEN MÅ IKKE LÆKKE GÆSTELISTEN. Den kører med sin
        ejers øjne og springer adgangsreglerne over — kommer der
        et navn eller et nummer med, er listen åben for
        internettet, og siden ville se helt rigtig ud imens. */
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'arrangement_pladser';
  insert into proev_svar values (8, 'pladsvisningen har kun de fire tal-kolonner',
    case when n = 4 then '✅ BESTOD' else '❌ FEJLEDE (' || n || ' kolonner)' end);

  /* 9) OG DEN REGNER RIGTIGT. To taget af fire (RE-P1), RE-P3 er
        afvist og tæller ikke, RE-P4 tog de to sidste. */
  select optaget into n from public.arrangement_pladser where kalender_id = koncert;
  insert into proev_svar values (9, 'pladsvisningen taeller det rigtige',
    case when n = 4 then '✅ BESTOD' else '❌ FEJLEDE (optaget=' || n || ')' end);

  /* 10) DUBLETVAGTEN. Samme nummer, samme arrangement — trykker
         gæsten to gange, fordi siden var langsom. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon, antal_personer)
      values ('RE-P10', 'proev-arr', kigforbi, 'Anna Vind', '20304050', 1);
    ok := true;
  exception when others then ok := false;
  end;
  -- kigforbi har ikke tilmelding, saa den afvises uanset; brug koncert.
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon, antal_personer)
      values ('RE-P11', 'proev-arr', koncert, 'Anna Igen', '20304050', 1);
    ok := true;
  exception when others then ok := false;
  end;
  insert into proev_svar values (10, 'samme nummer kan ikke staa to gange',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);

  /* 11) ET SELSKAB PÅ TREDIVE ER EN AFTALE, IKKE EN TILMELDING. */
  begin
    insert into public.reservationer (reference, lokation_id, kalender_id,
                                      navn, telefon, antal_personer)
      values ('RE-P12', 'proev-arr', koncert, 'Helt Hold', '20304057', 30);
    ok := true;
  exception when check_violation then ok := false;
       when others then ok := false;
  end;
  insert into proev_svar values (11, 'tredive personer paa en tilmelding afvises',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);
end $$;

select nr, hvad, resultat from proev_svar order by nr;

rollback;
