/* =========================================================
   command-center.js — collegamento facoltativo con AI Command Center
   - Con il "codice di collegamento" Rimedia invia i propri dati al Command Center
     (dispensa, spesa, piano, preferiti, idee, profilo; NON la cronologia) e riceve
     le modifiche chieste all'agente (es. "aggiungi alla spesa"), che applica e conferma.
   - Configurazione in localStorage["rimedia_cc"]; nessun dato lascia il dispositivo
     finché l'utente non incolla un codice.
   ========================================================= */
(function () {
  'use strict';
  var KEY = 'rimedia_cc';
  var OGNI_MS = 60000, RITARDO_MODIFICA_MS = 4000;
  var inCorso = false, timer = null;

  function leggiConf() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function scriviConf(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { } }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function decodifica(codice) {
    var t = String(codice || '').trim();
    if (t.indexOf('CC1:') !== 0) throw new Error('Il codice non è valido: deve iniziare con CC1:');
    var b = t.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var o = JSON.parse(atob(b));
    if (!o || !/^https?:\/\//.test(o.u || '') || !o.t) throw new Error('Il codice non è completo');
    return { u: o.u, t: o.t };
  }

  function datiDaInviare() {
    var s = typeof S !== 'undefined' ? S : {};
    return { app: 'rimedia', version: 2, date: new Date().toISOString(),
      data: { pantry: s.pantry || [], unsel: s.unsel || [], shopping: s.shopping || [], plan: s.plan || [], favs: s.favs || [], mine: s.mine || [], prof: s.prof || {} } };
  }

  // ---- Modifiche chieste dall'agente ----
  var AZIONI = {
    aggiungi_alla_spesa: function (p) {
      var prodotti = Array.isArray(p && p.prodotti) ? p.prodotti : [];
      var aggiunti = [];
      prodotti.forEach(function (x) {
        var nome = String((x && x.nome) || '').trim().slice(0, 80);
        if (!nome) return;
        var nn = function (x) { return typeof norm === 'function' ? norm(x) : String(x).toLowerCase().trim(); };
        var n = nn(nome);
        var esiste = S.shopping.some(function (i) { return !i.done && nn(i.name) === n; });
        if (esiste) return;
        S.shopping.push({ name: nome, qty: String((x && x.quantita) || '').slice(0, 30), cat: window.catOf ? catOf(nome) : 'Altro', done: false });
        aggiunti.push(nome);
      });
      return aggiunti.length ? 'Aggiunti alla spesa: ' + aggiunti.join(', ') : 'Nessun prodotto nuovo (erano già in lista)';
    },
  };

  function applica(comandi) {
    var esiti = [];
    (comandi || []).forEach(function (c) {
      try {
        var fn = AZIONI[c.operazione];
        if (!fn) throw new Error('Operazione non supportata da questa versione di Rimedia: ' + c.operazione);
        esiti.push({ id: c.id, ok: true, dettaglio: fn(c.parametri || {}) });
      } catch (e) { esiti.push({ id: c.id, ok: false, dettaglio: e.message }); }
    });
    if (esiti.some(function (e) { return e.ok; })) {
      try { localStorage.setItem('rimedia', JSON.stringify(S)); } catch (e) { }
      if (typeof window.render === 'function') window.render();
      if (typeof window.toast === 'function') window.toast('🧭 Command Center: ' + esiti.filter(function (e) { return e.ok; }).map(function (e) { return e.dettaglio; }).join(' · '));
    }
    return esiti;
  }

  async function sincronizza(manuale) {
    var conf = leggiConf();
    if (!conf.codice || inCorso) return;
    inCorso = true;
    try {
      var c = decodifica(conf.codice);
      var intest = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.t };
      var r = await fetch(c.u, { method: 'POST', headers: intest, body: JSON.stringify(datiDaInviare()) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(r.status === 401 ? 'Codice non più valido: generane uno nuovo nel Command Center' : (d.errore || ('Errore ' + r.status)));
      var esiti = applica(d.comandi);
      if (esiti.length) {
        await fetch(c.u + '/esiti', { method: 'POST', headers: intest, body: JSON.stringify({ esiti: esiti }) });
        // I dati sono cambiati: si reinviano subito aggiornati.
        await fetch(c.u, { method: 'POST', headers: intest, body: JSON.stringify(datiDaInviare()) });
      }
      conf = leggiConf(); conf.ultima = Date.now(); conf.errore = null; scriviConf(conf);
      if (manuale && typeof window.toast === 'function') window.toast('Sincronizzato con il Command Center');
    } catch (e) {
      conf = leggiConf();
      conf.errore = e instanceof TypeError ? 'Command Center non raggiungibile: è acceso su questo computer?' : e.message;
      scriviConf(conf);
      if (manuale && typeof window.toast === 'function') window.toast(conf.errore);
    } finally {
      inCorso = false;
      aggiornaPannello();
    }
  }

  function pianifica() { clearTimeout(timer); timer = setTimeout(function () { sincronizza(false); }, RITARDO_MODIFICA_MS); }

  function aggiornaPannello() {
    var el = document.getElementById('ccStato');
    if (el) el.innerHTML = statoHtml();
  }

  function statoHtml() {
    var conf = leggiConf();
    if (conf.errore) return '<div class="note warn">⚠️ ' + escH(conf.errore) + '</div>';
    if (conf.ultima) return '<div class="aihint">✅ Collegata · ultima sincronizzazione ' + new Date(conf.ultima).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '</div>';
    return '<div class="aihint">Collegamento in corso…</div>';
  }

  window.RCC = {
    pannello: function () {
      var conf = leggiConf();
      if (!conf.codice) {
        return '<div class="panel"><h3>🧭 Command Center</h3>' +
          '<div class="aihint">Collega Rimedia al tuo AI Command Center: l\'agente potrà leggere dispensa, spesa, piano e preferiti e aggiungere prodotti alla spesa. ' +
          'La cronologia e le chiavi AI non vengono inviate. Il codice si trova nel Command Center: Applicazioni → Rimedia → «Mostra codice di collegamento».</div>' +
          '<div class="row" style="margin-top:10px"><input class="inp" id="ccCodice" placeholder="Incolla qui il codice di collegamento (CC1:…)" autocomplete="off"></div>' +
          '<div class="acts"><button class="btn sm" data-a="cc-collega">Collega</button></div></div>';
      }
      return '<div class="panel"><h3>🧭 Command Center</h3><div id="ccStato">' + statoHtml() + '</div>' +
        '<div class="acts"><button class="btn sm sec" data-a="cc-sync">Sincronizza ora</button><button class="btn sm sec" data-a="cc-scollega">Scollega</button></div></div>';
    },
    click: function (a) {
      if (a === 'cc-collega') {
        var v = (document.getElementById('ccCodice') || {}).value || '';
        try { decodifica(v); } catch (e) { if (window.toast) toast(e.message); return true; }
        scriviConf({ codice: v.trim() });
        if (window.render) render();
        sincronizza(true);
        return true;
      }
      if (a === 'cc-sync') { sincronizza(true); return true; }
      if (a === 'cc-scollega') {
        if (!confirm('Scollegare Rimedia dal Command Center? I dati restano su questo dispositivo.')) return true;
        try { localStorage.removeItem(KEY); } catch (e) { }
        if (window.render) render();
        return true;
      }
      return false;
    },
  };

  // Avvio: dopo il caricamento della pagina (quando save/render di Rimedia esistono).
  window.addEventListener('load', function () {
    if (typeof window.save === 'function') {
      var originale = window.save;
      window.save = function () { var r = originale.apply(this, arguments); if (leggiConf().codice) pianifica(); return r; };
    }
    setTimeout(function () { sincronizza(false); }, 1500);
    setInterval(function () { if (document.visibilityState === 'visible') sincronizza(false); }, OGNI_MS);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') sincronizza(false); });
  });
})();
