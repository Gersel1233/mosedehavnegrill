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

/* ⚠️ HVER RÆKKE HAR SIN EGEN DATO — OG DET ER DEN RETTELSE, DER
   GJORDE, AT FILEN OVERHOVEDET MÅLER NOGET (9/9).

   Alle fem indlæg havde `dato` udfyldt af ingen, altså NULL, og
   tre af dem den samme tomme telefon. `forespoergsel_bremse`
   spærrer for det samme nummer + den samme type + den samme dato
   inden for ti minutter — og den bruger `is not distinct from`,
   netop så to NULL-datoer TÆLLER som ens. Prøve 3 ramte derfor
   dubletvagten i stedet for kontaktreglen, og et
   `raise exception` er ikke en `check_violation`: fejlen slap ud
   forbi handleren, hele DO-blokken døde, og filen skrev **nul**
   rapportlinjer. Altså faldt den ud af BÅDE BESTOD og FEJLEDE,
   og SQL-runden så grøn ud, mens fem regler stod uden vagt.

   Datoen er den rigtige akse at variere på: `kontakt_ok` og
   `telefon_form_ok` nævner den ikke, og de tre prøver, der SKAL
   have en tom telefon, beholder deres tomme telefon.

   ⚠️ OG AFSLAGET SKAL SIGE HVORFOR. Tidligere spurgte filen kun
   "blev den afvist?" — og det blev den, af det forkerte værn.
   Nu læses fejlteksten, og prøven kræver, at DEN regel, linjen
   handler om, er den, der sagde nej. Det er 2/9-arret fra
   `proev-bord-uden-telefon.sql`, hvor prøve 6 bestod, fordi
   bordet ikke fandtes. */
do $$
declare
  ok    boolean;
  grund text;
begin
  /* 1) KUN EN MAIL SKAL VIRKE — det er hele pointen. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status, dato)
      values ('FO-P1', 'proev-kontakt', 'baglokale', 'Kun Mail', '',
              'kun.mail@eksempel.dk', 'ny', current_date + 11);
    ok := true; grund := '';
  exception when others then ok := false; grund := sqlerrm;
  end;
  insert into proev_svar values (1, 'kun en mail slipper igennem',
    case when ok then '✅ BESTOD' else '❌ FEJLEDE — ' || grund end);

  /* 2) KUN ET NUMMER SKAL OGSÅ VIRKE — de fleste gæster ringer,
        og den vej må ikke lukke, fordi den anden åbnede. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status, dato)
      values ('FO-P2', 'proev-kontakt', 'baglokale', 'Kun Nummer',
              '20304050', null, 'ny', current_date + 12);
    ok := true; grund := '';
  exception when others then ok := false; grund := sqlerrm;
  end;
  insert into proev_svar values (2, 'kun et nummer slipper igennem',
    case when ok then '✅ BESTOD' else '❌ FEJLEDE — ' || grund end);

  /* 3) INGEN AF DELENE SKAL AFVISES. En forespørgsel uden en vej
        tilbage er et menneske, ingen kan svare. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status, dato)
      values ('FO-P3', 'proev-kontakt', 'baglokale', 'Ingen Vej', '', null,
              'ny', current_date + 13);
    ok := true; grund := '';
  exception when others then ok := false; grund := sqlerrm;
  end;
  insert into proev_svar values (3, 'uden nummer OG mail bliver afvist',
    case
      when ok then '❌ FEJLEDE — sluppet igennem'
      when grund not like '%forespoergsel_kontakt_ok%'
        then '❌ FEJLEDE — afvist af noget andet: ' || grund
      else '✅ BESTOD'
    end);

  /* 4) ET HALVT NUMMER ER STADIG EN TASTEFEJL — også når der er
        en mail. Uden den her ville personalet ringe forgæves. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status, dato)
      values ('FO-P4', 'proev-kontakt', 'baglokale', 'Halvt Nummer', '12',
              'halvt@eksempel.dk', 'ny', current_date + 14);
    ok := true; grund := '';
  exception when others then ok := false; grund := sqlerrm;
  end;
  insert into proev_svar values (4, 'et nummer paa to cifre bliver afvist',
    case
      when ok then '❌ FEJLEDE — sluppet igennem'
      when grund not like '%forespoergsel_telefon_form_ok%'
        then '❌ FEJLEDE — afvist af noget andet: ' || grund
      else '✅ BESTOD'
    end);

  /* 5) EN SKÆV MAIL ER IKKE EN VEJ TILBAGE. "anna@" må ikke
        kunne stå i stedet for et nummer.

     ⚠️ OG DEN STRAMMERE RAPPORT FANDT MED DET SAMME, AT DET IKKE
     ER `kontakt_ok`, DER SIGER NEJ (9/9). Det er
     `forespoergsel_email_ok` (forespoergsler.sql linje 103), og
     den bærer den **samme** regex som mailhalvdelen af
     `kontakt_ok` — så enhver mail, kontaktreglen ville vrage,
     er allerede vraget et lag før. Den gamle prøve spurgte kun
     "blev den afvist?" og kunne derfor ikke se forskellen.

     Begge navne er lovlige svar her, fordi de to regler siger
     hver sin ting om den samme mail: `email_ok` siger *"står
     der en mail, skal den se ud som en"*, `kontakt_ok` siger
     *"der skal være MINDST ÉN vej tilbage"*. Fjernes `email_ok`,
     afviser `kontakt_ok` stadig `anna@` med en tom telefon —
     reglen holder altså begge veje, og prøven skal ikke låses
     til det lag, der tilfældigvis svarer først. Men den bliver
     ved med at nævne dem ved navn: et afslag fra dubletvagten
     eller bremsen er stadig et FEJLEDE. */
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, email, status, dato)
      values ('FO-P5', 'proev-kontakt', 'baglokale', 'Skaev Mail', '',
              'anna@', 'ny', current_date + 15);
    ok := true; grund := '';
  exception when others then ok := false; grund := sqlerrm;
  end;
  insert into proev_svar values (5, 'en skaev mail taeller ikke som vej tilbage',
    case
      when ok then '❌ FEJLEDE — sluppet igennem'
      when grund not like '%forespoergsel_kontakt_ok%'
       and grund not like '%forespoergsel_email_ok%'
        then '❌ FEJLEDE — afvist af noget andet: ' || grund
      else '✅ BESTOD'
    end);
end $$;

select nr, hvad, resultat from proev_svar order by nr;

rollback;
