/* ============================================================
   SKRIVELAGET — personalesidens rettelser i databasen
   ------------------------------------------------------------
   Filen her lå inde i js/store.js, som ALLE sider indlæser. Det
   var 22 kB, gæsten aldrig får brug for: ingen gæsteside rører
   Butik.skrive. Gæsten skriver kun sin EGEN bestilling, og den
   vej — Butik.bestil() og søskende — ligger stadig i store.js.

   Vægtprøven i tests/vaegt.spec.js fældede forsiden på syv
   kilobyte, og dens egen note sagde, hvad svaret skulle være:
   "se på, om hele store.js hører til på forsiden, eller om den
   kan deles, så gæstens halvdel kommer alene."

   Indlæses KUN af admin.html, lige efter store.js. Glemmes den,
   findes Butik.skrive ikke, og det første gem giver en tydelig
   fejl i stedet for et stille no-op.
   ============================================================ */
(function () {
  'use strict';

  var I = window.ButikIndre;
  var LOKATION = I.LOKATION, MIT = I.MIT, SKY = I.SKY;
  var LOG_DAGE = I.LOG_DAGE, SKRALD_DAGE = I.SKRALD_DAGE;
  var SKRALD_TABELLER = I.SKRALD_TABELLER;
  var auth = I.auth, logLokalt = I.logLokalt, logSletLokalt = I.logSletLokalt;
  var lokalt = I.lokalt, læsLokalt = I.læsLokalt, nu = I.nu, næsteId = I.næsteId;
  var pris = I.pris, skraldTabel = I.skraldTabel, skriv = I.skriv;
  var status = I.status, talEllerNull = I.talEllerNull, tvilling = I.tvilling;

  var skrive = {
    // Alle syv dage på én gang. Upsert på (lokation_id, ugedag).
    tider: function (lokationId, rækker) {
      var rene = rækker.map(function (r) {
        return {
          lokation_id: lokationId,
          ugedag: Number(r.ugedag),
          lukket: !!r.lukket,
          aabner: r.lukket ? null : String(r.aabner).slice(0, 5),
          lukker: r.lukket ? null : String(r.lukker).slice(0, 5),
        };
      });

      if (!SKY) return lokalt(function (d) { d.aabningstider = rene; });
      return skriv('POST', 'aabningstider', 'on_conflict=lokation_id,ugedag', rene, true);
    },

    /* Kalenderen erstatter lukkedage. Én skrivning til tre ting:
       et arrangement, en lukkedag og en tidlig lukning er samme
       række med forskellig type. */
    kalender: function (r) {
      var ren = {
        lokation_id: r.lokation_id || LOKATION,
        type: r.type,
        dato: r.dato,
        slut_dato: r.slut_dato || null,
        titel: String(r.titel || '').trim().slice(0, 120),
        beskrivelse: String(r.beskrivelse || '').trim() ? String(r.beskrivelse).trim().slice(0, 2000) : null,
        emoji: String(r.emoji || '').trim() ? String(r.emoji).trim().slice(0, 8) : null,
        // Databasen kræver et klokkeslæt ved tidlig lukning og
        // ingen ved de to andre. Sender vi et med alligevel,
        // afvises rækken af en regel, brugeren ikke kan se.
        lukker_kl: r.type === 'tidlig_lukning' ? (r.lukker_kl || null) : null,
        offentlig: !!r.offentlig,
      };

      if (!SKY) return lokalt(function (d) {
        d.kalender = d.kalender || [];
        if (r.id) {
          d.kalender = d.kalender.map(function (k) {
            return String(k.id) === String(r.id) ? Object.assign({}, k, ren) : k;
          });
        } else {
          var ny = Object.assign({ id: næsteId(d.kalender) }, ren);
          d.kalender.push(ny);
        }
      });

      if (r.id) {
        return skriv('PATCH', 'kalender', 'id=eq.' + encodeURIComponent(r.id),
          Object.assign({ aendret: new Date().toISOString() }, ren));
      }
      return skriv('POST', 'kalender', null, [ren]);
    },

    /* Bordene. Numrene må ikke stå i koden — så er hver
       ommøblering på trædækket en kodeændring hos os. */
    bord: function (r) {
      var ren = {
        lokation_id: r.lokation_id || LOKATION,
        nummer: String(r.nummer || '').trim().slice(0, 40),
        pladser: talEllerNull(r.pladser),
        placering: r.placering === 'ude' ? 'ude' : 'inde',
        aktiv: r.aktiv !== false,
        sortering: Math.round(Number(r.sortering) || 0),
      };

      if (!SKY) return lokalt(function (d) {
        d.borde = d.borde || [];
        /* Samme unikke nøgle som databasens: "Bord 7" og
           "bord 7 " er ét bord. Uden den tager øvetilstanden imod
           noget, skyen afviser — og så er det ikke en øvelse. */
        var findes = d.borde.some(function (b) {
          return String(b.id) !== String(r.id)
            && b.nummer.trim().toLowerCase() === ren.nummer.toLowerCase();
        });
        if (findes) throw new Error('Der er allerede et bord, der hedder ' + ren.nummer + '.');

        if (r.id) {
          d.borde = d.borde.map(function (b) {
            return String(b.id) === String(r.id) ? Object.assign({}, b, ren) : b;
          });
        } else {
          d.borde.push(Object.assign({ id: næsteId(d.borde) }, ren));
        }
      });

      if (r.id) {
        return skriv('PATCH', 'borde', 'id=eq.' + encodeURIComponent(r.id),
          Object.assign({ aendret: new Date().toISOString() }, ren));
      }
      return skriv('POST', 'borde', null, [ren]);
    },

    sletBord: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.borde = (d.borde || []).filter(function (b) {
          return String(b.id) !== String(id);
        });
      });
      return skriv('DELETE', 'borde', 'id=eq.' + encodeURIComponent(id));
    },

    sletKalender: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.kalender = (d.kalender || []).filter(function (k) {
          return String(k.id) !== String(id);
        });
      });
      return skriv('DELETE', 'kalender', 'id=eq.' + encodeURIComponent(id));
    },

    /* KATEGORIERNE KUNNE KUN OPRETTES I SQL.

       Admin skrev det højt: "Der er ingen kategorier endnu. De
       oprettes i setup.sql." Det er et svar til en udvikler, ikke
       til en ejer, der gerne vil have en afdeling, der hedder
       "Vinterretter". Adgangsreglerne i flerlejer.sql har givet
       admin lov til at oprette, rette og slette i
       menu_kategorier hele tiden — der manglede bare en vej
       derhen fra skærmen.

       'grill' er det gamle navn for 'mad', og databasen afviser
       det (constraint afdeling_gyldig). Det oversættes her, så en
       gammel række ikke kan gemmes tilbage i en form, den ikke
       må have. */
    kategori: function (k) {
      var afd = k.afdeling === 'grill' ? 'mad' : k.afdeling;
      var ren = {
        lokation_id: k.lokation_id || LOKATION,
        afdeling: ['mad', 'is', 'drikke'].indexOf(afd) === -1 ? 'mad' : afd,
        navn: String(k.navn).trim(),
        /* Noten står over kategoriens varer på menukortet — fx
           "På toastbrød eller rugbrød", som gælder alle tolv
           slags pindemad. Tom er tom og ikke en tom streng:
           databasen skelner, og en tom streng ville tegne en
           tom linje på kortet. */
        note: String(k.note || '').trim() ? String(k.note).trim().slice(0, 200) : null,
        sortering: Number(k.sortering) || 0,
        aktiv: k.aktiv !== false,
      };

      if (!SKY) {
        return lokalt(function (d) {
          d.menu_kategorier = d.menu_kategorier || [];
          if (k.id) {
            d.menu_kategorier = d.menu_kategorier.map(function (x) {
              return String(x.id) === String(k.id)
                ? Object.assign({}, x, ren, { id: x.id }) : x;
            });
          } else {
            ren.id = næsteId(d.menu_kategorier);
            d.menu_kategorier.push(ren);
          }
        });
      }

      return k.id
        ? skriv('PATCH', 'menu_kategorier', 'id=eq.' + encodeURIComponent(k.id), ren)
        : skriv('POST', 'menu_kategorier', '', [ren]);
    },

    /* Databasen sletter varerne med (on delete cascade), og det er
       netop derfor, admin kun tilbyder det på en TOM kategori: et
       tryk må ikke kunne tage 29 varer med sig. */
    sletKategori: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.menu_kategorier = (d.menu_kategorier || [])
          .filter(function (x) { return String(x.id) !== String(id); });
        d.menu_varer = (d.menu_varer || [])
          .filter(function (x) { return String(x.kategori_id) !== String(id); });
      });
      return skriv('DELETE', 'menu_kategorier', 'id=eq.' + encodeURIComponent(id));
    },

    vare: function (v) {
      var ren = {
        kategori_id: Number(v.kategori_id),
        navn: String(v.navn).trim(),
        beskrivelse: v.beskrivelse ? String(v.beskrivelse).trim() : null,
        pris: talEllerNull(v.pris),
        fremhaevet: !!v.fremhaevet,
        udsolgt: !!v.udsolgt,
        sortering: Number(v.sortering) || 0,
        aktiv: v.aktiv !== false,
      };

      if (!SKY) {
        return lokalt(function (d) {
          d.menu_varer = d.menu_varer || [];
          if (v.id) {
            d.menu_varer = d.menu_varer.map(function (x) {
              return String(x.id) === String(v.id) ? Object.assign({}, x, ren, { id: x.id }) : x;
            });
          } else {
            ren.id = næsteId(d.menu_varer);
            d.menu_varer.push(ren);
          }
        });
      }

      return v.id
        ? skriv('PATCH', 'menu_varer', 'id=eq.' + encodeURIComponent(v.id), ren)
        : skriv('POST', 'menu_varer', '', [ren]);
    },

    sletVare: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.menu_varer = (d.menu_varer || []).filter(function (x) { return String(x.id) !== String(id); });
      });
      return skriv('DELETE', 'menu_varer', 'id=eq.' + encodeURIComponent(id));
    },

    nyhed: function (n) {
      var ren = {
        titel: String(n.titel).trim(),
        tekst: String(n.tekst).trim(),
        dato: n.dato || nu().dato,
        aktiv: n.aktiv !== false,
        /* Tom betyder ALTID — og derfor null og ikke "". En tom
           streng i en datokolonne afvises af databasen, og en
           nyhed uden slutdato er det normale, ikke undtagelsen.
           Kræver supabase/nyheder-fra-til.sql. */
        vis_fra: String(n.vis_fra || '').trim() || null,
        vis_til: String(n.vis_til || '').trim() || null,
      };

      if (!SKY) {
        return lokalt(function (d) {
          d.nyheder = d.nyheder || [];
          if (n.id) {
            d.nyheder = d.nyheder.map(function (x) {
              return String(x.id) === String(n.id) ? Object.assign({}, x, ren, { id: x.id }) : x;
            });
          } else {
            ren.id = næsteId(d.nyheder);
            d.nyheder.unshift(ren);
          }
        });
      }

      /* Lokationen sættes kun ved oprettelse. En nyhed skal ikke
         kunne flytte forretning, fordi nogen retter en stavefejl
         i overskriften. */
      if (n.id) return skriv('PATCH', 'nyheder', 'id=eq.' + encodeURIComponent(n.id), ren);
      ren.lokation_id = LOKATION;
      return skriv('POST', 'nyheder', '', [ren]);
    },

    sletNyhed: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.nyheder = (d.nyheder || []).filter(function (x) { return String(x.id) !== String(id); });
      });
      return skriv('DELETE', 'nyheder', 'id=eq.' + encodeURIComponent(id));
    },

    indstilling: function (nøgle, værdi) {
      if (!SKY) return lokalt(function (d) {
        d.indstillinger = d.indstillinger || {};
        d.indstillinger[nøgle] = værdi;
      });
      /* on_conflict SKAL nævne lokationen. Primærnøglen er
         (lokation_id, noegle) nu, og "on_conflict=noegle" alene
         ville få databasen til at afvise hele kaldet – ikke
         overskrive den forkerte række, men det er en fejl man
         først ser når man trykker Gem. */
      return skriv('POST', 'indstillinger', 'on_conflict=lokation_id,noegle',
        [{ lokation_id: LOKATION, noegle: nøgle, vaerdi: værdi,
           aendret: new Date().toISOString() }], true);
    },

    lokation: function (l) {
      var ren = {
        navn: String(l.navn).trim(),
        adresse: String(l.adresse).trim(),
        postnr: String(l.postnr).trim(),
        by: String(l.by).trim(),
        telefon: l.telefon ? String(l.telefon).trim() : null,
        beskrivelse: l.beskrivelse ? String(l.beskrivelse).trim() : null,
      };

      if (!SKY) return lokalt(function (d) {
        d.lokationer = (d.lokationer || []).map(function (x) {
          return x.id === l.id ? Object.assign({}, x, ren) : x;
        });
      });
      return skriv('PATCH', 'lokationer', 'id=eq.' + encodeURIComponent(l.id), ren);
    },

    /* ---- Bestillinger, set fra personalets side ----
       Kun status og den interne note kan rettes. Gæstens navn,
       telefon, dato og linjer bliver stående som de blev sendt:
       en bestilling personalet kan skrive om, er ikke længere et
       bevis på hvad gæsten bad om. Skal noget ændres, ringer man
       og laver en ny. */
    bestillingStatus: function (id, status, note) {
      var ren = { status: status, aendret: new Date().toISOString() };
      if (note !== undefined) ren.intern_note = note ? String(note).slice(0, 1000) : null;

      if (!SKY) return lokalt(function (d) {
        d.bestillinger = (d.bestillinger || []).map(function (b) {
          if (String(b.id) !== String(id)) return b;
          var ny = Object.assign({}, b, ren);
          logLokalt(d, 'bestillinger', b, ny);
          return ny;
        });
      });
      return skriv('PATCH', 'bestillinger', 'id=eq.' + encodeURIComponent(id), ren);
    },

    sletBestilling: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.bestillinger = (d.bestillinger || []).filter(function (b) {
          if (String(b.id) === String(id)) logSletLokalt(d, 'bestillinger', b);
          return String(b.id) !== String(id);
        });
      });
      return skriv('DELETE', 'bestillinger', 'id=eq.' + encodeURIComponent(id));
    },

    /* ---- Forespørgsler, set fra personalets side ----
       Nøjagtig samme regel som ved bestillingerne: kun status og
       den interne note kan rettes. Gæstens egne ord er et referat
       af, hvad der blev spurgt om, og et referat man kan skrive om,
       er ikke længere et bevis. */
    forespoergselStatus: function (id, status, note) {
      var ren = { status: status, aendret: new Date().toISOString() };
      if (note !== undefined) ren.intern_note = note ? String(note).slice(0, 1000) : null;

      if (!SKY) return lokalt(function (d) {
        d.forespoergsler = (d.forespoergsler || []).map(function (f) {
          if (String(f.id) !== String(id)) return f;
          var ny = Object.assign({}, f, ren);
          logLokalt(d, 'forespoergsler', f, ny);
          return ny;
        });
      });
      return skriv('PATCH', 'forespoergsler', 'id=eq.' + encodeURIComponent(id), ren);
    },

    sletForespoergsel: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.forespoergsler = (d.forespoergsler || []).filter(function (f) {
          if (String(f.id) === String(id)) logSletLokalt(d, 'forespoergsler', f);
          return String(f.id) !== String(id);
        });
      });
      return skriv('DELETE', 'forespoergsler', 'id=eq.' + encodeURIComponent(id));
    },

    bordStatus: function (id, status, note) {
      var ren = { status: status, aendret: new Date().toISOString() };
      if (note !== undefined) ren.intern_note = note ? String(note).slice(0, 1000) : null;

      if (!SKY) return lokalt(function (d) {
        d.bordbestillinger = (d.bordbestillinger || []).map(function (b) {
          if (String(b.id) !== String(id)) return b;
          var ny = Object.assign({}, b, ren);
          logLokalt(d, 'bordbestillinger', b, ny);
          return ny;
        });
      });
      return skriv('PATCH', 'bordbestillinger', 'id=eq.' + encodeURIComponent(id), ren);
    },

    /* Samme navnesammenstød som ovenfor, anden gang samme dag:
       den her sletter en bordBESTILLING, og mens den hed
       sletBord, gjorde "Slet bord" i admin INGENTING — uden en
       fejl nogen steder. */
    sletBordbestilling: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.bordbestillinger = (d.bordbestillinger || []).filter(function (b) {
          if (String(b.id) === String(id)) logSletLokalt(d, 'bordbestillinger', b);
          return String(b.id) !== String(id);
        });
      });
      return skriv('DELETE', 'bordbestillinger', 'id=eq.' + encodeURIComponent(id));
    },

    udlejningStatus: function (id, status, note) {
      var ren = { status: status, aendret: new Date().toISOString() };
      if (note !== undefined) ren.intern_note = note ? String(note).slice(0, 1000) : null;

      if (!SKY) {
        var d0 = læsLokalt();
        /* Øvetilstanden skal håndhæve dagen-er-taget som databasen,
           ellers opfører øvelsen sig anderledes end det rigtige —
           og testene ville bestå med et ja, produktionen afviser. */
        if (status === 'bekraeftet') {
          var mig = (d0.udlejninger || []).filter(function (u) {
            return String(u.id) === String(id);
          })[0];
          var taget = mig && (d0.udlejninger || []).some(function (u) {
            return String(u.id) !== String(id)
              && u.dato === mig.dato
              && u.lokation_id === mig.lokation_id
              && u.status === 'bekraeftet'
              /* En bekræftet udlejning i skraldespanden holder IKKE
                 dagen. Gjorde den det, ville lokalet være optaget
                 for evigt af noget, ingen kan se. */
              && !u.slettet;
          });
          if (taget) {
            return Promise.reject(new Error(
              'Dagen er allerede lejet ud – der kan kun være ét ja pr. dag. '
              + 'Afvis det gamle først, hvis det er aflyst.'));
          }
        }
        return lokalt(function (d) {
          d.udlejninger = (d.udlejninger || []).map(function (u) {
            if (String(u.id) !== String(id)) return u;
            var ny = Object.assign({}, u, ren);
            logLokalt(d, 'udlejninger', u, ny);
            return ny;
          });
        });
      }
      return skriv('PATCH', 'udlejninger', 'id=eq.' + encodeURIComponent(id), ren);
    },

    sletUdlejning: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.udlejninger = (d.udlejninger || []).filter(function (u) {
          if (String(u.id) === String(id)) logSletLokalt(d, 'udlejninger', u);
          return String(u.id) !== String(id);
        });
      });
      return skriv('DELETE', 'udlejninger', 'id=eq.' + encodeURIComponent(id));
    },

    /* ---- Skraldespanden: smid ud, fortryd, tøm ----
       "Slet" i admin sætter en dato i stedet for at fjerne rækken.
       Se supabase/skraldespand.sql for hvorfor det ikke er nok at
       skjule den: nøglerne og bremserne skal også se bort fra
       spanden, ellers spærrer noget usynligt for gæsten bagefter.

       De tre er skrevet ÉN gang og tager en "slags", i stedet for
       tolv næsten ens funktioner. Fejlen, det forhindrer, er den
       kedelige slags: den dag en femte tabel kommer til, og de
       elleve af tolv bliver rettet. */
    tilSkraldespand: function (slags, id) {
      var t = skraldTabel(slags);
      var nuIso = new Date().toISOString();

      if (!SKY) return lokalt(function (d) {
        d[t.tabel] = (d[t.tabel] || []).map(function (r) {
          if (String(r.id) !== String(id)) return r;
          var ny = Object.assign({}, r, { slettet: nuIso, aendret: nuIso });
          logLokalt(d, t.tabel, r, ny);
          return ny;
        });
      });
      return skriv('PATCH', t.tabel, 'id=eq.' + encodeURIComponent(id),
        { slettet: nuIso, aendret: nuIso });
    },

    fortryd: function (slags, id) {
      var t = skraldTabel(slags);
      var nuIso = new Date().toISOString();

      if (!SKY) {
        /* Øvetilstanden skal afvise det samme som databasen.
           Gjorde den ikke det, ville en prøve på siden bestå med et
           ja, produktionen svarer nej på — og det er præcis den
           slags forskel, ingen opdager før en gæst gør. */
        var d0 = læsLokalt();
        var mig = (d0[t.tabel] || []).filter(function (r) {
          return String(r.id) === String(id);
        })[0];
        if (mig && tvilling(d0[t.tabel], mig, t.tabel)) {
          return Promise.reject(new Error(
            'Den kan ikke hentes tilbage: gæsten har sendt præcis den samme '
            + 'igen, mens den lå i skraldespanden. Den nye står på listen.'));
        }
        /* Og lokalet kan være lejet ud til en anden imens. Den
           besked er en anden: der er ikke sendt noget igen, dagen
           er bare givet væk. */
        if (mig && mig.status === 'bekraeftet' && t.tabel === 'udlejninger'
          && (d0.udlejninger || []).some(function (u) {
            return String(u.id) !== String(mig.id) && !u.slettet
              && u.dato === mig.dato && u.lokation_id === mig.lokation_id
              && u.status === 'bekraeftet';
          })) {
          return Promise.reject(new Error(
            'Dagen er allerede lejet ud – der kan kun være ét ja pr. dag. '
            + 'Afvis det gamle først, hvis det er aflyst.'));
        }
        return lokalt(function (d) {
          d[t.tabel] = (d[t.tabel] || []).map(function (r) {
            if (String(r.id) !== String(id)) return r;
            var ny = Object.assign({}, r, { aendret: nuIso, slettet: null });
            logLokalt(d, t.tabel, r, ny);
            return ny;
          });
        });
      }
      return skriv('PATCH', t.tabel, 'id=eq.' + encodeURIComponent(id),
        { slettet: null, aendret: nuIso });
    },

    sletForAltid: function (slags, id) {
      var t = skraldTabel(slags);
      if (!SKY) return lokalt(function (d) {
        d[t.tabel] = (d[t.tabel] || []).filter(function (r) {
          if (String(r.id) === String(id)) logSletLokalt(d, t.tabel, r);
          return String(r.id) !== String(id);
        });
      });
      return skriv('DELETE', t.tabel, 'id=eq.' + encodeURIComponent(id));
    },

    /* Tømningen af det, der er for gammelt. Den kører, når
       personalet åbner fanen, og ikke på en tidsplan: Supabase har
       ingen cron slået til i det her projekt, og en knap, nogen
       skal huske at trykke på, er ikke en oprydning.

       Adgangsreglerne sørger for, at der kun slettes i egen
       forretning — filteret på lokationen står her af samme grund
       som alle andre steder: den dag en person er chef to steder,
       skal Mosedes spand ikke tømme Køges. */
    toemGamle: function () {
      var graense = new Date(Date.now() - SKRALD_DAGE * 24 * 60 * 60 * 1000)
        .toISOString();

      if (!SKY) return lokalt(function (d) {
        SKRALD_TABELLER.forEach(function (t) {
          d[t.tabel] = (d[t.tabel] || []).filter(function (r) {
            return !r.slettet || r.slettet > graense;
          });
        });
      });

      return Promise.all(SKRALD_TABELLER.map(function (t) {
        return skriv('DELETE', t.tabel,
          'slettet=lt.' + encodeURIComponent(graense) + MIT);
      }));
    },

    /* Logbogen kan ikke rettes — der er ingen update-regel — men
       linjer skal kunne blive for gamle. Ryddes ved login, samme
       sted som skraldespanden, og af samme grund: en knap, nogen
       skal huske at trykke på, er ikke en oprydning. */
    ryddLogbog: function () {
      var graense = new Date(Date.now() - LOG_DAGE * 24 * 60 * 60 * 1000)
        .toISOString();

      if (!SKY) return lokalt(function (d) {
        d.logbog = (d.logbog || []).filter(function (l) {
          return l.hvornaar > graense;
        });
      });
      return skriv('DELETE', 'logbog',
        'hvornaar=lt.' + encodeURIComponent(graense) + MIT);
    },

    /* ---- Push (fase 5c) ----
       Et abonnement er retten til at sende til en telefon, så
       tabellen er admin-land i databasen — se supabase/push.sql.
       Upsert på endpoint: til/fra/til på samme enhed skal ikke
       give tre rækker og tre ens beskeder. */
    gemPush: function (a) {
      var raekke = {
        lokation_id: LOKATION,
        email: auth.email() || 'ukendt',
        enhed: a.enhed ? String(a.enhed).slice(0, 120) : null,
        endpoint: String(a.endpoint).slice(0, 1000),
        p256dh: String(a.p256dh),
        auth: String(a.auth),
      };
      if (!SKY) return lokalt(function (d) {
        d.push_abonnementer = (d.push_abonnementer || []).filter(function (x) {
          return x.endpoint !== raekke.endpoint;
        });
        raekke.id = næsteId(d.push_abonnementer);
        raekke.oprettet = new Date().toISOString();
        d.push_abonnementer.unshift(raekke);
      });
      return skriv('POST', 'push_abonnementer', 'on_conflict=endpoint', [raekke], true);
    },

    sletPush: function (endpoint) {
      if (!SKY) return lokalt(function (d) {
        d.push_abonnementer = (d.push_abonnementer || []).filter(function (x) {
          return x.endpoint !== endpoint;
        });
      });
      return skriv('DELETE', 'push_abonnementer',
        'endpoint=eq.' + encodeURIComponent(endpoint));
    },
  };

  window.Butik.skrive = skrive;
})();
