/* ============================================================
   PRØVE: MAIL ELLER NUMMER  (29/8-2026)
   ------------------------------------------------------------
   Kør EFTER foresp-kontakt.sql. Den skriver testrækker, læser
   dem og RULLER ALT TILBAGE — der bliver ikke en eneste række
   tilbage i forretningens data.

   Prøven er skrevet, så den kan FEJLE: hver linje beviser noget,
   der ville være galt uden filen. Fjern constraintet og kør igen,
   så skriver linje 1 og 2 FEJLEDE.
   ============================================================ */

begin;

create temporary table proev_svar (nr int, hvad text, resultat text)
  on commit drop;

/* Én lokation at hænge rækkerne på. */
insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
  values ('proev-kontakt', 'Prøve', 'Vej 1', '2670', 'Greve', '11111111')
  on conflict (id) do nothing;

do $$
declare
  ok boolean;
begin
  /* 1) KUN EN MAIL SKAL VIRKE — det er hele pointen. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status)
      values ('FO-P1', 'proev-kontakt', 'baglokale', 'Kun Mail', '',
              'kun.mail@eksempel.dk', 'ny');
    ok := true;
  exception when check_violation then ok := false;
  end;
  insert into proev_svar values (1, 'kun en mail slipper igennem',
    case when ok then '✅ BESTOD' else '❌ FEJLEDE' end);

  /* 2) KUN ET NUMMER SKAL OGSÅ VIRKE — de fleste gæster ringer,
        og den vej må ikke lukke, fordi den anden åbnede. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status)
      values ('FO-P2', 'proev-kontakt', 'baglokale', 'Kun Nummer',
              '20304050', null, 'ny');
    ok := true;
  exception when check_violation then ok := false;
  end;
  insert into proev_svar values (2, 'kun et nummer slipper igennem',
    case when ok then '✅ BESTOD' else '❌ FEJLEDE' end);

  /* 3) INGEN AF DELENE SKAL AFVISES. En forespørgsel uden en vej
        tilbage er et menneske, ingen kan svare. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status)
      values ('FO-P3', 'proev-kontakt', 'baglokale', 'Ingen Vej', '', null, 'ny');
    ok := true;
  exception when check_violation then ok := false;
  end;
  insert into proev_svar values (3, 'uden nummer OG mail bliver afvist',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);

  /* 4) ET HALVT NUMMER ER STADIG EN TASTEFEJL — også når der er
        en mail. Uden den her ville personalet ringe forgæves. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status)
      values ('FO-P4', 'proev-kontakt', 'baglokale', 'Halvt Nummer', '12',
              'halvt@eksempel.dk', 'ny');
    ok := true;
  exception when check_violation then ok := false;
  end;
  insert into proev_svar values (4, 'et nummer paa to cifre bliver afvist',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);

  /* 5) EN SKÆV MAIL ER IKKE EN VEJ TILBAGE. "anna@" må ikke
        kunne stå i stedet for et nummer. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status)
      values ('FO-P5', 'proev-kontakt', 'baglokale', 'Skaev Mail', '', 'anna@', 'ny');
    ok := true;
  exception when check_violation then ok := false;
  end;
  insert into proev_svar values (5, 'en skaev mail taeller ikke som vej tilbage',
    case when ok then '❌ FEJLEDE' else '✅ BESTOD' end);
end $$;

select nr, hvad, resultat from proev_svar order by nr;

rollback;
