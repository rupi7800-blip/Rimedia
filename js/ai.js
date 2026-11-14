/* =========================================================
   Rimedia — motore AI multi-servizio
   Riprende l'architettura di Garden Manager AI (js/ai.js):
   - configurazione { primary, fallback, providers:{id:{enabled,key,model,base}} }
   - tre adattatori: Gemini (API nativa), formato compatibile OpenAI, Claude (SDK ufficiale)
     più l'adattatore "claudeapp" per quando Rimedia è aperta dentro Claude
   - rotazione automatica sul servizio successivo se la quota finisce o c'è un errore
   - errori tradotti in italiano con codice (auth, rate, model, server, conn, offline…)
   - le chiavi restano solo nel dispositivo (localStorage), mai nel codice
   Espone window.RAI.
   ========================================================= */
(function () {
  'use strict';
  var P = window.RIMEDIA_AI_PROVIDERS, PROVIDERS = P.PROVIDERS, PROVIDER_ORDER = P.PROVIDER_ORDER;
  var KEY = 'rimedia_ai_v2', OLD_KEY = 'rimedia_ai';

  function AIError(msg, code, provider) { var e = new Error(msg); e.name = 'AIError'; e.code = code; e.provider = provider; return e; }

  // ── Configurazione (con migrazione dalla versione precedente di Rimedia) ──
  function readRaw() {
    try { var j = localStorage.getItem(KEY); if (j) return JSON.parse(j); } catch (e) { }
    var old = null; try { old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); } catch (e) { }
    var cfg = { primary: 'gemini', fallback: true, providers: {} };
    if (old && typeof old === 'object') {
      // vecchio formato: { prov, keys:{}, models:{} } — lo convertiamo senza cancellarlo
      var map = { groq: 'groq', gemini: 'gemini', openrouter: 'openrouter', openai: 'openai', pollinations: 'pollinations', claude: 'claudeapp' };
      Object.keys(old.keys || {}).forEach(function (k) {
        var id = map[k]; if (!id || !old.keys[k]) return;
        cfg.providers[id] = { enabled: true, key: String(old.keys[k]).trim(), model: (old.models || {})[k] || '' };
      });
      if (old.prov && map[old.prov]) cfg.primary = map[old.prov];
      if (cfg.primary === 'pollinations' && !cfg.providers.pollinations) cfg.providers.pollinations = { enabled: true, key: '' };
    }
    return cfg;
  }
  function config(raw) {
    var ai = raw || readRaw();
    var providers = {};
    PROVIDER_ORDER.forEach(function (id) {
      providers[id] = Object.assign({ enabled: false, key: '', model: '', base: '' }, (ai.providers || {})[id] || {});
    });
    // dentro Claude il servizio dell'app è attivo finché l'utente non lo disattiva
    if (inApp() && !((ai.providers || {}).claudeapp)) providers.claudeapp.enabled = true;
    return { primary: ai.primary || 'gemini', fallback: ai.fallback !== false, providers: providers, saveHistory: ai.saveHistory };
  }
  function save(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { } }
  function inApp() { return typeof window.__rimediaSample === 'function'; }

  function usable(id, cfg) {
    var p = PROVIDERS[id], c = cfg.providers[id];
    if (p.inApp) return inApp() && c.enabled;
    return c.enabled && (!p.needsKey || !!c.key) && (id !== 'custom' || !!c.base);
  }
  function hasAI(cfg) { cfg = cfg || config(); return PROVIDER_ORDER.some(function (id) { return usable(id, cfg); }); }
  function activeProviders(cfg) {
    cfg = cfg || config();
    var order = [cfg.primary].concat(PROVIDER_ORDER.filter(function (x) { return x !== cfg.primary; }));
    var list = order.filter(function (id) { return usable(id, cfg); });
    return cfg.fallback ? list : list.slice(0, 1);
  }
  function providerLabel(id) { return (PROVIDERS[id] && PROVIDERS[id].label) || id; }
  function modelFor(id, cfg) { return cfg.providers[id].model || PROVIDERS[id].model; }
  function baseFor(id, cfg) {
    var c = cfg.providers[id], p = PROVIDERS[id];
    if (id === 'pollinations' && c.key && !c.base) return p.keyBase;
    return (c.base || p.base || '').replace(/\/+$/, '');
  }

  // ── Errori ──
  function httpError(status, body, id) {
    var label = providerLabel(id);
    var msg = (body && ((body.error && body.error.message) || body.message || (typeof body.error === 'string' ? body.error : ''))) || '';
    if (status === 401 || status === 403) return AIError(label + ': chiave non valida o senza accesso a questo modello.', 'auth', id);
    if (status === 402) return AIError(label + ': credito esaurito o assente.', 'rate', id);
    if (status === 429) return AIError(label + ': limite gratuito raggiunto per ora. Riprova più tardi o aggiungi un altro servizio come riserva.', 'rate', id);
    if (status === 404) return AIError(label + ': modello non trovato. Aggiorna l\'elenco dei modelli in Impostazioni AI.', 'model', id);
    if (status === 400 && /api key/i.test(msg)) return AIError(label + ': chiave non valida, ricopiala.', 'auth', id);
    if (status >= 500) return AIError(label + ': servizio momentaneamente non disponibile (' + status + ').', 'server', id);
    return AIError(label + ': richiesta non accettata (' + status + ') ' + String(msg).slice(0, 200), 'bad', id);
  }
  function doFetch(url, opts, id, timeoutMs) {
    timeoutMs = timeoutMs || 90000;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(AIError('Sei offline: le funzioni AI richiedono una connessione.', 'offline', id));
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
    return fetch(url, Object.assign({}, opts, { signal: ctrl.signal })).then(function (r) {
      clearTimeout(timer);
      if (r.ok) return r;
      return r.json().catch(function () { return null; }).then(function (b) { throw httpError(r.status, b, id); });
    }, function (e) {
      clearTimeout(timer);
      if (e && e.name === 'AbortError') throw AIError(providerLabel(id) + ': nessuna risposta entro ' + Math.round(timeoutMs / 1000) + ' secondi.', 'conn', id);
      throw AIError(providerLabel(id) + ': servizio non raggiungibile dal browser (rete, blocco o CORS).', 'conn', id);
    });
  }
  var RETRYABLE = ['rate', 'server', 'conn', 'model', 'auth', 'refusal', 'parse'];
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // ── JSON robusto ──
  function parseJSON(text) {
    var t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    return JSON.parse(t);
  }

  function readSSE(response, onData) {
    var reader = response.body.getReader(), dec = new TextDecoder(), buf = '';
    function pump() {
      return reader.read().then(function (x) {
        if (x.done) return;
        buf += dec.decode(x.value, { stream: true });
        var i;
        while ((i = buf.indexOf('\n')) >= 0) {
          var line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (line.indexOf('data:') === 0) { var d = line.slice(5).trim(); if (d) { try { onData(d); } catch (e) { /* frammento non valido */ } } }
        }
        return pump();
      });
    }
    return pump();
  }

  // ── Adattatori ──
  function geminiCall(id, cfg, o) {
    var model = o.model || modelFor(id, cfg), key = cfg.providers[id].key, base = baseFor(id, cfg);
    var contents = o.history.map(function (m) { return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }; });
    var body = { systemInstruction: { parts: [{ text: o.system }] }, contents: contents, generationConfig: { maxOutputTokens: Math.max(o.maxTokens, 8192), temperature: 0.6 } };
    if (o.json) body.generationConfig.responseMimeType = 'application/json';
    var headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
    if (!o.stream) {
      return doFetch(base + '/models/' + encodeURIComponent(model) + ':generateContent', { method: 'POST', headers: headers, body: JSON.stringify(body) }, id, o.timeoutMs)
        .then(function (r) { return r.json(); }).then(function (j) {
          if (j.promptFeedback && j.promptFeedback.blockReason) throw AIError(providerLabel(id) + ': richiesta bloccata dai filtri del servizio.', 'refusal', id);
          var c = (j.candidates || [])[0];
          var text = ((c && c.content && c.content.parts) || []).filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('');
          if (!text) throw AIError(providerLabel(id) + ': risposta vuota (' + ((c && c.finishReason) || 'sconosciuto') + ').', 'refusal', id);
          return { text: text, model: model };
        });
    }
    var text = '';
    return doFetch(base + '/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse', { method: 'POST', headers: headers, body: JSON.stringify(body) }, id, o.timeoutMs)
      .then(function (r) {
        return readSSE(r, function (data) {
          var j = JSON.parse(data), c = (j.candidates || [])[0]; if (!c) return;
          var t = ((c.content && c.content.parts) || []).filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('');
          if (t) { text += t; o.onText && o.onText(t); }
        });
      }).then(function () {
        if (!text) throw AIError(providerLabel(id) + ': risposta vuota.', 'refusal', id);
        return { text: text, model: model };
      });
  }

  function openaiCall(id, cfg, o) {
    var p = PROVIDERS[id], model = o.model || modelFor(id, cfg);
    if (!model && id !== 'pollinations') return Promise.reject(AIError(p.label + ': indica il modello in Impostazioni AI.', 'model', id));
    var key = cfg.providers[id].key;
    var messages = [{ role: 'system', content: o.system }].concat(o.history.map(function (m) { return { role: m.role, content: m.content }; }));
    var body = { model: model || 'openai', messages: messages, max_tokens: o.maxTokens, temperature: 0.6 };
    if (o.json) body.response_format = { type: 'json_object' };
    if (o.stream) body.stream = true;
    if (id === 'pollinations' && !key) body.private = true;
    var headers = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = 'Bearer ' + key;
    if (id === 'openrouter') { headers['HTTP-Referer'] = (location.origin && location.origin !== 'null') ? location.origin : 'https://rimedia.app'; headers['X-Title'] = 'Rimedia'; }
    var base = baseFor(id, cfg);
    var url = (id === 'pollinations' && !key && !cfg.providers[id].base) ? base : base + '/chat/completions';
    var send = function () { return doFetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }, id, o.timeoutMs); };
    return send().catch(function (e) {
      if (e.code !== 'bad' || !body.response_format) throw e; // alcuni modelli non supportano la modalità JSON
      delete body.response_format; return send();
    }).then(function (r) {
      if (!o.stream) {
        return r.text().then(function (raw) {
          var text = raw;
          try { var j = JSON.parse(raw); if (j.choices) { var c = j.choices[0].message.content; text = Array.isArray(c) ? c.map(function (t) { return t.text || ''; }).join('') : (c || ''); } } catch (e) { /* risposta in testo semplice (Pollinations) */ }
          if (!text) throw AIError(p.label + ': risposta vuota.', 'refusal', id);
          return { text: text, model: model };
        });
      }
      var text = '';
      return readSSE(r, function (data) {
        if (data === '[DONE]') return;
        var j = JSON.parse(data), t = (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
        if (t) { text += t; o.onText && o.onText(t); }
      }).then(function () {
        if (!text) throw AIError(p.label + ': risposta vuota.', 'refusal', id);
        return { text: text, model: model };
      });
    });
  }

  // Claude (a pagamento): SDK ufficiale caricato solo se scelto, come in Garden Manager
  var SDK = null, claude = null, claudeKey = null;
  function anthropicCall(id, cfg, o) {
    var key = cfg.providers[id].key;
    var load = SDK ? Promise.resolve() : import(new URL('../vendor/anthropic-sdk.js', SCRIPT_SRC).href).then(function (m) { SDK = m.default; });
    return load.then(function () {
      if (!claude || claudeKey !== key) { claude = new SDK({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 120000 }); claudeKey = key; }
      var model = o.model || modelFor(id, cfg);
      var params = { model: model, max_tokens: o.maxTokens, system: [{ type: 'text', text: o.system, cache_control: { type: 'ephemeral' } }], output_config: { effort: 'medium' }, messages: o.history.map(function (m) { return { role: m.role, content: m.content }; }) };
      if (/^claude-(opus|sonnet)/.test(model)) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
      var pr;
      if (o.stream) { var s = claude.beta.messages.stream(params); s.on('text', function (t) { o.onText && o.onText(t); }); pr = s.finalMessage(); }
      else pr = claude.beta.messages.create(params);
      return pr.then(function (msg) {
        if (msg.stop_reason === 'refusal') throw AIError('Claude non ha elaborato questa richiesta.', 'refusal', id);
        return { text: msg.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join(''), model: model };
      });
    }).catch(function (e) {
      if (e && e.name === 'AIError') throw e;
      if (e && e.status) throw httpError(e.status, e.error, id);
      throw AIError('Claude: ' + ((e && e.message) || e), 'conn', id);
    });
  }

  // Rimedia aperta dentro Claude: usa la funzione "sample" dell'ambiente
  function claudeAppCall(id, cfg, o) {
    var fn = window.__rimediaSample;
    if (typeof fn !== 'function') return Promise.reject(AIError('Claude non è disponibile qui.', 'auth', id));
    var msgs = o.history.map(function (m, i) { return { role: m.role === 'assistant' ? 'assistant' : 'user', content: (i === 0 ? o.system + '\n\n' : '') + m.content }; });
    return Promise.resolve(fn(msgs, { modelTier: 'default', cache: false })).then(function (r) {
      var text = (r && r.text) || '';
      if (!text) throw AIError('Claude: risposta vuota.', 'refusal', id);
      o.onText && o.onText(text);
      return { text: text, model: 'claude' };
    }, function (e) {
      if (e && e.code === 'rate_limited') throw AIError('Claude: troppe richieste, riprova tra poco.', 'rate', id);
      if (e && e.code === 'not_granted') throw AIError('Permesso non concesso per usare Claude.', 'auth', id);
      throw AIError('Claude: ' + ((e && e.message) || 'errore'), 'conn', id);
    });
  }

  var ADAPTERS = { gemini: geminiCall, openai: openaiCall, anthropic: anthropicCall, claudeapp: claudeAppCall };

  // Un servizio: riprova una volta se il server è occupato e prova i modelli alternativi se quello scelto non esiste
  function callProvider(id, cfg, o) {
    var p = PROVIDERS[id];
    var models = [modelFor(id, cfg)].concat(cfg.providers[id].model ? [] : p.models.filter(function (m) { return m !== p.model; }).slice(0, 2));
    var mi = 0, busy = 0;
    function attempt() {
      return ADAPTERS[p.kind](id, cfg, Object.assign({}, o, { model: models[mi] })).catch(function (e) {
        if (o.stream && o.started && o.started()) throw e;
        if (e.code === 'server' && busy < 1) { busy++; o.onStatus && o.onStatus(providerLabel(id) + ' occupato, riprovo…'); return sleep(1500).then(attempt); }
        if (e.code === 'model' && mi < models.length - 1 && models[mi + 1]) { mi++; return attempt(); }
        throw e;
      });
    }
    return attempt();
  }

  var api = { lastProvider: null, lastModel: null };

  // Esegue la richiesta sul servizio principale e, se serve, su quelli di riserva
  function run(opts) {
    var cfg = config();
    if (!hasAI(cfg)) return Promise.reject(AIError('Configura almeno un servizio AI: tocca ⚙️ AI in alto (Google Gemini e Groq sono gratuiti).', 'nokey'));
    var list = activeProviders(cfg), errors = [];
    var o = Object.assign({ maxTokens: 4096 }, opts);
    if (!o.history) o.history = [{ role: 'user', content: String(o.content || '') }];
    var i = 0;
    function next() {
      if (i >= list.length) {
        var e = errors[errors.length - 1];
        if (errors.length > 1) e.message += ' (provati: ' + errors.map(function (x) { return providerLabel(x.provider); }).join(', ') + ')';
        return Promise.reject(e);
      }
      var id = list[i++];
      o.onStatus && o.onStatus('Chiedo a ' + providerLabel(id) + '…');
      return callProvider(id, cfg, o).then(function (res) {
        if (o.json) {
          try { res.json = parseJSON(res.text); }
          catch (e) { throw AIError(providerLabel(id) + ': risposta non in formato JSON.', 'parse', id); }
        }
        res.provider = id; api.lastProvider = id; api.lastModel = res.model;
        return res;
      }).catch(function (e) {
        var err = (e && e.name === 'AIError') ? e : AIError((e && e.message) || String(e), 'unknown', id);
        errors.push(err);
        if (o.stream && o.started && o.started()) throw err; // testo già mostrato: non ricominciare altrove
        if (RETRYABLE.indexOf(err.code) < 0) throw err;
        return next();
      });
    }
    return next();
  }

  // Prova di collegamento di un singolo servizio (senza rotazione)
  function testProvider(id, raw) {
    var cfg = config(raw); cfg.providers[id].enabled = true;
    var t0 = performance.now();
    return callProvider(id, cfg, { system: 'Test di collegamento. Rispondi in italiano in una frase brevissima.', history: [{ role: 'user', content: 'Dimmi un consiglio anti-spreco in cucina in massimo 15 parole.' }], maxTokens: 200, timeoutMs: 30000 })
      .then(function (res) { return { text: res.text, model: res.model, seconds: ((performance.now() - t0) / 1000).toFixed(1) }; });
  }
  // Elenco dei modelli disponibili presso il servizio
  function listModels(id, raw) {
    var cfg = config(raw), p = PROVIDERS[id], key = cfg.providers[id].key, base = baseFor(id, cfg);
    if (p.needsKey && !key) return Promise.reject(AIError('Inserisci prima la chiave API.', 'auth', id));
    if (p.kind === 'gemini') {
      return doFetch(base + '/models?pageSize=200', { headers: { 'x-goog-api-key': key } }, id, 20000).then(function (r) { return r.json(); }).then(function (j) {
        return (j.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name.replace('models/', ''); })
          .filter(function (n) { return /^(gemini|gemma)/.test(n) && !/(embedding|tts|image|audio|live|robotics|computer-use|veo|imagen)/.test(n); });
      });
    }
    if (p.kind === 'anthropic') return Promise.resolve(p.models.slice());
    if (p.kind === 'claudeapp' || id === 'pollinations') return Promise.resolve(p.models.slice());
    return doFetch(base + '/models', { headers: key ? { Authorization: 'Bearer ' + key } : {} }, id, 20000).then(function (r) { return r.json(); }).then(function (j) {
      var ids = (j.data || j.models || []).map(function (m) { return m.id || m.name; }).filter(Boolean);
      return id === 'openrouter' ? ids.filter(function (x) { return /:free$/.test(x); }) : ids;
    });
  }

  var SCRIPT_SRC = document.currentScript ? document.currentScript.src : location.href;
  Object.assign(api, {
    PROVIDERS: PROVIDERS, PROVIDER_ORDER: PROVIDER_ORDER, NOT_INCLUDED: P.NOT_INCLUDED,
    AIError: AIError, config: config, readRaw: readRaw, save: save, hasAI: hasAI, activeProviders: activeProviders,
    providerLabel: providerLabel, usable: usable, inApp: inApp, run: run, parseJSON: parseJSON,
    testProvider: testProvider, listModels: listModels
  });
  window.RAI = api;
})();
